import React, { useMemo, useState } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import type { ClaimResult, ClaimerCredit, Order } from '@/types';
import { api } from '@/services/api';
import { useUserStore } from '@/store/user';
import {
  formatMoney,
  formatTime,
  ORDER_STATUS_TEXT,
  ORDER_TYPE_TEXT,
  urgentText
} from '@/utils/format';
import StatusTag from '@/components/StatusTag';
import styles from './index.module.scss';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STEPS = ['发布', '接单', '待确认', '完成'];

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id || '';
  const openid = useUserStore((s) => s.profile?.openid);
  const login = useUserStore((s) => s.login);

  const [order, setOrder] = useState<Order | null>(null);
  const [contact, setContact] = useState<string | undefined>(undefined);
  const [claimerContact, setClaimerContact] = useState<string | undefined>(undefined);
  const [claimerCredit, setClaimerCredit] = useState<ClaimerCredit | undefined>(undefined);
  const [reviewed, setReviewed] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sheet, setSheet] = useState<null | 'finish' | 'cancel'>(null);
  const [sheetText, setSheetText] = useState('');
  const [acting, setActing] = useState(false);

  const isPoster = order?.posterOpenid === openid;
  const isClaimer = order?.claimerOpenid === openid;

  const load = async () => {
    setLoadError(false);
    try {
      const res = await api.getOrderDetail(id);
      setOrder(res.order);
      setContact(res.contact);
      setClaimerContact(res.claimerContact);
      setClaimerCredit(res.claimerCredit);
      if (res.myReview) setReviewed(true);
    } catch (err) {
      console.error('[OrderDetail] load failed:', err);
      setLoadError(true);
    }
  };

  useDidShow(() => {
    login().then(() => load());
  });

  const stepIndex = useMemo(() => {
    if (!order) return 0;
    switch (order.status) {
      case 'pending':
        return 0;
      case 'claimed':
        return 1;
      case 'submitted':
      case 'disputed':
        return 2;
      case 'completed':
        return 3;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }, [order]);

  const copyContact = () => {
    if (!contact) return;
    Taro.setClipboardData({ data: contact });
  };

  const copyClaimerContact = () => {
    if (!claimerContact) return;
    Taro.setClipboardData({ data: claimerContact });
  };

  // ---------- 接单支付 ----------
  const handleClaim = async () => {
    // 注意：微信 showModal 的 confirmText/cancelText 最多 4 个字符，超长会静默失败
    let confirm: { confirm: boolean; cancel: boolean };
    try {
      confirm = await Taro.showModal({
        title: '接单信息费',
        content: `支付 ¥${formatMoney(order?.infoFee || 0)} 信息费（报酬 5%）后解锁发单人联系方式。平台仅提供撮合记录，报酬请线下自行结算。`,
        confirmText: '确认接单',
        cancelText: '再想想'
      });
    } catch (modalErr) {
      console.error('[OrderDetail] showModal failed:', modalErr);
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
      return;
    }
    if (!confirm.confirm) return;

    setActing(true);
    try {
      const res: ClaimResult = await api.claimOrder(id);
      if (res.payParams && process.env.TARO_ENV === 'weapp') {
        // 微信端：唤起支付，结果由 payCallback 云函数幂等落账
        try {
          await Taro.requestPayment(res.payParams);
          Taro.showLoading({ title: '支付确认中...' });
          await sleep(1500); // 等待支付回调
          Taro.hideLoading();
        } catch (payErr) {
          Taro.hideLoading();
          console.error('[OrderDetail] payment canceled/failed:', payErr);
          Taro.showToast({ title: '支付未完成，接单取消', icon: 'none' });
          return;
        }
      }
      Taro.showToast({ title: '接单成功，联系方式已解锁', icon: 'success' });
      await load();
    } catch (err) {
      console.error('[OrderDetail] claim failed:', err);
      Taro.showToast({ title: (err as Error).message || '接单失败', icon: 'none' });
    } finally {
      setActing(false);
    }
  };

  const handleConfirm = async () => {
    const res = await Taro.showModal({
      title: '确认完成',
      content: '请确认已在线下收到服务并与对方结清报酬，确认后订单完成并可互相评价。',
      confirmText: '确认完成'
    });
    if (!res.confirm) return;
    setActing(true);
    try {
      await api.confirmOrder(id);
      Taro.showToast({ title: '订单已完成', icon: 'success' });
      await load();
    } catch (err) {
      console.error('[OrderDetail] confirm failed:', err);
    } finally {
      setActing(false);
    }
  };

  const submitSheet = async () => {
    if (sheet === 'finish' && !sheetText.trim()) {
      Taro.showToast({ title: '请简单描述完成情况', icon: 'none' });
      return;
    }
    if (sheet === 'cancel' && order?.status === 'claimed' && !sheetText.trim()) {
      Taro.showToast({ title: '接单后取消需填写原因', icon: 'none' });
      return;
    }
    setActing(true);
    try {
      if (sheet === 'finish') {
        await api.submitFinish(id, sheetText.trim());
        Taro.showToast({ title: '已提交，等待对方确认', icon: 'success' });
      } else {
        await api.cancelOrder(id, sheetText.trim());
        Taro.showToast({ title: '订单已取消', icon: 'success' });
      }
      setSheet(null);
      setSheetText('');
      await load();
    } catch (err) {
      console.error('[OrderDetail] sheet submit failed:', err);
      Taro.showToast({ title: (err as Error).message || '操作失败', icon: 'none' });
    } finally {
      setActing(false);
    }
  };

  const goReview = () => {
    if (!order) return;
    const toOpenid = isPoster ? order.claimerOpenid : order.posterOpenid;
    const role = isPoster ? 'poster' : 'claimer';
    Taro.navigateTo({
      url: `/pages/review/index?id=${order._id}&to=${toOpenid}&role=${role}`
    });
  };

  const goReport = () => {
    if (!order) return;
    const targetOpenid = isPoster ? order.claimerOpenid || '' : order.posterOpenid;
    Taro.navigateTo({
      url: `/pages/report/index?orderId=${order._id}&target=${targetOpenid}`
    });
  };

  if (!order) {
    return (
      <View className={styles.page}>
        {loadError ? (
          <View className={styles.loadErrorBox}>
            <Text className={styles.loadErrorText}>订单加载失败，请检查网络后重试</Text>
            <Button className={styles.retryBtn} onClick={() => load()}>
              重新加载
            </Button>
          </View>
        ) : (
          <Text className={styles.loadingText}>加载中...</Text>
        )}
      </View>
    );
  }

  return (
    <View className={styles.page}>
      {/* 状态横幅 */}
      <View className={classnames(styles.statusBanner, styles[`banner_${order.status}`])}>
        <Text className={styles.statusTitle}>{ORDER_STATUS_TEXT[order.status]}</Text>
        <Text className={styles.statusDesc}>
          {order.status === 'pending' && '订单正在大厅等待接单'}
          {order.status === 'claimed' && '联系方式已解锁，请尽快线下沟通交付'}
          {order.status === 'submitted' && (isPoster ? '接单人已提交完成，请确认' : '已提交，等待发单人确认（超时自动确认）')}
          {order.status === 'completed' && '订单已完成，记得互相评价积累信誉'}
          {order.status === 'cancelled' && '订单已取消'}
          {order.status === 'disputed' && '订单进入纠纷处理，平台将依据记录判责'}
        </Text>
      </View>

      {/* 进度条 */}
      {order.status !== 'cancelled' && order.status !== 'disputed' ? (
        <View className={styles.stepCard}>
          {STEPS.map((step, idx) => (
            <View key={step} className={styles.stepItem}>
              <View
                className={classnames(
                  styles.stepDot,
                  idx <= stepIndex && styles.stepDotActive,
                  idx === stepIndex && styles.stepDotCurrent
                )}
              >
                <Text>{idx + 1}</Text>
              </View>
              <Text
                className={classnames(
                  styles.stepLabel,
                  idx <= stepIndex && styles.stepLabelActive
                )}
              >
                {step}
              </Text>
              {idx < STEPS.length - 1 ? (
                <View className={classnames(styles.stepLine, idx < stepIndex && styles.stepLineActive)} />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* 订单内容 */}
      <View className={styles.card}>
        <View className={styles.cardHeader}>
          <View className={styles.typeBadge}>
            <Text>{ORDER_TYPE_TEXT[order.type]}</Text>
          </View>
          <StatusTag status={order.status} />
        </View>
        <Text className={styles.title}>{order.title}</Text>
        {order.detail ? <Text className={styles.detail}>{order.detail}</Text> : null}

        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>📍 交付地点</Text>
          <Text className={styles.infoValue}>
            {order.location}
            {order.classroom ? ` · ${order.classroom}` : ''}
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>⏰ 期望时间</Text>
          <Text className={styles.infoValue}>
            {formatTime(order.expectTime)}（{urgentText(order.expectTime)}）
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>🕓 发布时间</Text>
          <Text className={styles.infoValue}>{formatTime(order.createdAt)}</Text>
        </View>
      </View>

      {/* 费用说明 */}
      <View className={styles.card}>
        <View className={styles.feeRow}>
          <Text className={styles.feeLabel}>线下报酬</Text>
          <Text className={styles.feePrice}>¥{formatMoney(order.price)}</Text>
        </View>
        <View className={styles.feeRow}>
          <Text className={styles.feeLabel}>接单信息费（{Math.round(order.infoFeeRate * 100)}%）</Text>
          <Text className={styles.feeInfoPrice}>¥{formatMoney(order.infoFee)}</Text>
        </View>
        <Text className={styles.feeNotice}>
          信息费归平台所有，用于解锁联系方式；报酬由双方线下自行结算，平台不经手、不担保
        </Text>
      </View>

      {/* 对方信息 */}
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>{isPoster ? '接单人' : '发单人'}</Text>
        {isPoster && order.status === 'pending' ? (
          <Text className={styles.mutedText}>暂无人接单，可在大厅分享订单</Text>
        ) : (
          <View className={styles.personRow}>
            {(isPoster ? order.claimerName : order.posterName) ? (
              <>
                <View className={styles.personAvatar}>
                  <Text>{(isPoster ? order.claimerName : order.posterName)?.slice(0, 1)}</Text>
                </View>
                <Text className={styles.personName}>
                  {isPoster ? order.claimerName : order.posterName}
                </Text>
              </>
            ) : (
              <Text className={styles.mutedText}>暂无</Text>
            )}
          </View>
        )}

        {/* 接单人联系方式 + 信用（仅发单人可见） */}
        {isPoster && claimerContact ? (
          <View className={styles.contactBox}>
            <View className={styles.contactInfo}>
              <Text className={styles.contactLabel}>接单人联系方式</Text>
              <Text className={styles.contactValue}>{claimerContact}</Text>
            </View>
            <Button className={styles.copyBtn} onClick={copyClaimerContact}>
              复制
            </Button>
          </View>
        ) : null}

        {isPoster && claimerCredit ? (
          <View className={styles.creditBox}>
            <View className={styles.creditRow}>
              <Text className={styles.creditLabel}>信誉分</Text>
              <Text
                className={classnames(
                  styles.creditScore,
                  claimerCredit.creditScore >= 90
                    ? styles.creditGood
                    : styles.creditWarn
                )}
              >
                {claimerCredit.creditScore}
              </Text>
            </View>
            <View className={styles.creditRow}>
              <Text className={styles.creditLabel}>历史评分</Text>
              <Text className={styles.creditValue}>
                {claimerCredit.avgScore.toFixed(1)} 分（{claimerCredit.ratingCount}人评价）
              </Text>
            </View>
            <View className={styles.creditRow}>
              <Text className={styles.creditLabel}>接单/完成</Text>
              <Text className={styles.creditValue}>
                {claimerCredit.acceptedCount} 单 · 完成率 {claimerCredit.finishRate}%
              </Text>
            </View>
          </View>
        ) : null}

        {contact ? (
          <View className={styles.contactBox}>
            <View className={styles.contactInfo}>
              <Text className={styles.contactLabel}>联系方式（已解锁）</Text>
              <Text className={styles.contactValue}>{contact}</Text>
            </View>
            <Button className={styles.copyBtn} onClick={copyContact}>
              复制
            </Button>
          </View>
        ) : (
          <View className={styles.contactLocked}>
            <Text>🔒 支付 5% 信息费后解锁联系方式</Text>
          </View>
        )}
      </View>

      {/* 完成凭证 */}
      {order.proofNote ? (
        <View className={styles.card}>
          <Text className={styles.sectionTitle}>完成说明</Text>
          <Text className={styles.detail}>{order.proofNote}</Text>
        </View>
      ) : null}

      {/* 举报入口 */}
      <View className={styles.reportEntry} onClick={goReport}>
        <Text>遇到虚假订单 / 爽约 / 纠纷？点此举报申诉</Text>
      </View>

      {/* 底部操作栏 */}
      <View className={styles.actionBar}>
        {order.status === 'pending' && !isPoster ? (
          <Button className={styles.primaryBtn} loading={acting} onClick={handleClaim}>
            立即接单 · 支付信息费 ¥{formatMoney(order.infoFee)}
          </Button>
        ) : null}
        {order.status === 'pending' && isPoster ? (
          <Button className={styles.ghostBtn} onClick={() => setSheet('cancel')}>
            取消订单
          </Button>
        ) : null}
        {order.status === 'claimed' && isClaimer ? (
          <View className={styles.btnGroup}>
            <Button className={styles.ghostBtn} onClick={copyContact}>
              复制联系方式
            </Button>
            <Button
              className={styles.primaryBtn}
              loading={acting}
              onClick={() => {
                setSheetText('');
                setSheet('finish');
              }}
            >
              提交完成
            </Button>
          </View>
        ) : null}
        {order.status === 'claimed' && isPoster ? (
          <Button
            className={styles.ghostBtn}
            onClick={() => {
              setSheetText('');
              setSheet('cancel');
            }}
          >
            协商取消
          </Button>
        ) : null}
        {order.status === 'submitted' && isPoster ? (
          <Button className={styles.primaryBtn} loading={acting} onClick={handleConfirm}>
            确认完成并评价
          </Button>
        ) : null}
        {order.status === 'submitted' && isClaimer ? (
          <Text className={styles.barHint}>已提交完成，等待发单人确认（48 小时未操作系统自动确认）</Text>
        ) : null}
        {order.status === 'completed' && (isPoster || isClaimer) ? (
          <Button
            className={classnames(styles.primaryBtn, reviewed && styles.primaryBtnDone)}
            disabled={reviewed}
            onClick={goReview}
          >
            {reviewed ? '已评价' : '去评价对方'}
          </Button>
        ) : null}
        {(order.status === 'cancelled' || order.status === 'disputed') &&
        (isPoster || isClaimer) ? (
          <Text className={styles.barHint}>
            {order.status === 'cancelled' ? '订单已取消' : '纠纷处理中，处理结果将通过通知发送'}
          </Text>
        ) : null}
      </View>

      {/* 取消/完成 弹层 */}
      {sheet ? (
        <View className={styles.mask} onClick={() => setSheet(null)}>
          <View className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.sheetTitle}>
              {sheet === 'finish' ? '提交完成说明' : order.status === 'claimed' ? '协商取消' : '取消订单'}
            </Text>
            <Textarea
              className={styles.sheetInput}
              placeholder={
                sheet === 'finish'
                  ? '简单描述完成情况，如：已放入宿舍门卫架并拍照'
                  : order.status === 'claimed'
                    ? '请填写取消原因，信息费是否退还以管理员判责为准'
                    : '取消原因（选填）'
              }
              value={sheetText}
              maxlength={200}
              onInput={(e) => setSheetText(e.detail.value)}
            />
            <View className={styles.sheetBtns}>
              <Button className={styles.sheetCancel} onClick={() => setSheet(null)}>
                再想想
              </Button>
              <Button className={styles.sheetConfirm} loading={acting} onClick={submitSheet}>
                确认
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default OrderDetailPage;
