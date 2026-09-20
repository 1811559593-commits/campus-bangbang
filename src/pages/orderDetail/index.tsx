import React, { useMemo, useState } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import type { Order } from '@/types';
import { api, type ClaimerCredit } from '@/services/api';
import { useUserStore } from '@/store/user';
import {
  formatMoney,
  formatTime,
  isTopped,
  ORDER_STATUS_TEXT,
  ORDER_TYPE_TEXT,
  urgentText,
  URGENT_CARD_PRICE,
  URGENT_TOP_HOURS
} from '@/utils/format';
import StatusTag from '@/components/StatusTag';
import styles from './index.module.scss';

const STEPS = ['发布', '接单', '待确认', '完成'];

/** 个人虚拟支付（Taro 4.1 类型定义可能未收录，运行时按能力检测） */
function requestVirtualPayment(payParams: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    const fn = (Taro as any).requestVirtualPayment;
    if (typeof fn !== 'function') {
      reject(new Error('当前微信版本不支持虚拟支付，请升级后重试'));
      return;
    }
    fn.call(Taro, {
      ...payParams,
      success: () => resolve(),
      fail: (err: any) => reject(new Error(err?.errMsg || '支付未完成'))
    });
  });
}

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
  const topped = order ? isTopped(order) : false;

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
      case 'applied':
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

  // ---------- 免费申请接单 ----------
  const handleClaim = async () => {
    // 注意：微信 showModal 的 confirmText/cancelText 最多 4 个字符，超长会静默失败
    let confirm: { confirm: boolean; cancel: boolean };
    try {
      confirm = await Taro.showModal({
        title: '申请接单',
        content:
          '提交申请后，发单人可查看你的联系方式并确认选择；发单人确认后，你才能看到对方联系方式。平台不收取费用，报酬请线下自行结算。',
        confirmText: '确认申请',
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
      await api.claimOrder(id);
      Taro.showToast({ title: '申请已提交，等待发单人确认', icon: 'none' });
      await load();
    } catch (err) {
      console.error('[OrderDetail] claim failed:', err);
      Taro.showToast({ title: (err as Error).message || '申请失败', icon: 'none' });
    } finally {
      setActing(false);
    }
  };

  // ---------- 发单人确认选择接单人 ----------
  const handleConfirmClaim = async () => {
    const res = await Taro.showModal({
      title: '确认选择该接单人',
      content: '确认后你的联系方式将向对方公开，订单进入进行中。请确认对方资料真实可靠。',
      confirmText: '确认选择'
    });
    if (!res.confirm) return;
    setActing(true);
    try {
      await api.confirmClaimOrder(id);
      Taro.showToast({ title: '已确认，联系方式已公开', icon: 'success' });
      await load();
    } catch (err) {
      console.error('[OrderDetail] confirmClaim failed:', err);
      Taro.showToast({ title: (err as Error).message || '操作失败', icon: 'none' });
    } finally {
      setActing(false);
    }
  };

  // ---------- 加急卡置顶 ----------
  const handleBuyTop = async () => {
    const res = await Taro.showModal({
      title: '加急置顶卡',
      content: `支付 ¥${URGENT_CARD_PRICE} 购买加急卡，订单将在大厅置顶 ${URGENT_TOP_HOURS} 小时，让更多帮手优先看到。`,
      confirmText: '购买'
    });
    if (!res.confirm) return;
    setActing(true);
    try {
      const r = await api.buyUrgentCard(id);
      if (r.payParams && process.env.TARO_ENV === 'weapp') {
        // 正式虚拟支付：唤起个人虚拟支付，发货由微信回调异步完成
        await requestVirtualPayment(r.payParams);
      }
      Taro.showToast({ title: `加急成功，置顶${URGENT_TOP_HOURS}小时`, icon: 'success' });
      await load();
    } catch (err) {
      console.error('[OrderDetail] buy urgent card failed:', err);
      Taro.showToast({ title: (err as Error).message || '购买失败', icon: 'none' });
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
      Taro.showToast({ title: '确认接单后取消需填写原因', icon: 'none' });
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
          {order.status === 'applied' &&
            (isPoster
              ? '接单人已申请，请查看其信息并确认选择'
              : '已申请接单，等待发单人确认，确认后展示联系方式')}
          {order.status === 'claimed' && '双方已对接，请尽快线下沟通交付'}
          {order.status === 'submitted' &&
            (isPoster ? '接单人已提交完成，请确认' : '已提交，等待发单人确认')}
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
          <View className={styles.headerBadges}>
            <View className={styles.typeBadge}>
              <Text>{ORDER_TYPE_TEXT[order.type]}</Text>
            </View>
            {topped ? (
              <View className={styles.topBadge}>
                <Text>🔥 加急置顶中</Text>
              </View>
            ) : null}
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

      {/* 报酬说明 */}
      <View className={styles.card}>
        <View className={styles.feeRow}>
          <Text className={styles.feeLabel}>线下报酬（双方自行结算）</Text>
          <Text className={styles.feePrice}>¥{formatMoney(order.price)}</Text>
        </View>
        <Text className={styles.feeNotice}>
          接单免费：发单人确认接单人后双方联系方式互通；平台仅提供信息撮合与信誉记录，不经手报酬、不担保交易
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
              <Text className={styles.contactLabel}>
                {isPoster ? '我的联系方式（已向对方公开）' : '发单人联系方式（发单人已确认）'}
              </Text>
              <Text className={styles.contactValue}>{contact}</Text>
            </View>
            <Button className={styles.copyBtn} onClick={copyContact}>
              复制
            </Button>
          </View>
        ) : isClaimer && order.status === 'applied' ? (
          <View className={styles.contactLocked}>
            <Text>🔒 已申请接单，发单人确认选择后为你展示联系方式</Text>
          </View>
        ) : (
          <View className={styles.contactLocked}>
            <Text>🔒 申请接单并经发单人确认后，可查看联系方式</Text>
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
            我要接单 · 免费申请
          </Button>
        ) : null}
        {order.status === 'pending' && isPoster ? (
          <View className={styles.btnGroup}>
            <Button className={styles.ghostBtn} onClick={() => setSheet('cancel')}>
              取消订单
            </Button>
            {topped ? (
              <Text className={styles.barHint}>🔥 加急置顶中</Text>
            ) : (
              <Button className={styles.topBtn} loading={acting} onClick={handleBuyTop}>
                加急置顶 ¥{URGENT_CARD_PRICE}
              </Button>
            )}
          </View>
        ) : null}
        {order.status === 'applied' && isPoster ? (
          <View className={styles.btnGroup}>
            <Button
              className={styles.ghostBtn}
              onClick={() => {
                setSheetText('');
                setSheet('cancel');
              }}
            >
              取消订单
            </Button>
            <Button className={styles.primaryBtn} loading={acting} onClick={handleConfirmClaim}>
              确认选择该接单人
            </Button>
          </View>
        ) : null}
        {order.status === 'applied' && isClaimer ? (
          <View className={styles.btnGroup}>
            <Button
              className={styles.ghostBtn}
              onClick={() => {
                setSheetText('');
                setSheet('cancel');
              }}
            >
              取消申请
            </Button>
            <Text className={styles.barHint}>等待发单人确认，确认后可见联系方式</Text>
          </View>
        ) : null}
        {order.status === 'applied' && isPoster && topped ? (
          <Text className={styles.barHint}>🔥 加急置顶中，大厅优先展示</Text>
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
          <Text className={styles.barHint}>已提交完成，等待发单人确认</Text>
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
              {sheet === 'finish'
                ? '提交完成说明'
                : order.status === 'claimed'
                  ? '协商取消'
                  : order.status === 'applied'
                    ? isPoster
                      ? '取消订单'
                      : '取消申请'
                    : '取消订单'}
            </Text>
            <Textarea
              className={styles.sheetInput}
              placeholder={
                sheet === 'finish'
                  ? '简单描述完成情况，如：已放入宿舍门卫架并拍照'
                  : order.status === 'claimed'
                    ? '请填写取消原因，平台将依据记录进行信誉处理'
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
