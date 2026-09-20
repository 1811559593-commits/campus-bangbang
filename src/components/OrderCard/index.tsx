import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { Order } from '@/types';
import { ORDER_TYPE_TEXT, formatMoney, fromNow, isTopped, urgentText } from '@/utils/format';
import StatusTag from '@/components/StatusTag';
import styles from './index.module.scss';

interface OrderCardProps {
  order: Order;
  /** 是否展示发单人信息（大厅卡片展示；我的订单可不展示） */
  showPoster?: boolean;
  onClick?: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, showPoster = true, onClick }) => {
  const topped = isTopped(order);
  return (
    <View
      className={classnames(styles.card, topped && styles.cardTopped)}
      onClick={() => onClick?.(order)}
    >
      <View className={styles.header}>
        <View className={styles.headerBadges}>
          <View className={styles.typeBadge}>
            <Text>{ORDER_TYPE_TEXT[order.type]}</Text>
          </View>
          {topped ? (
            <View className={styles.topBadge}>
              <Text>🔥 加急</Text>
            </View>
          ) : null}
        </View>
        <StatusTag status={order.status} />
      </View>

      <Text className={styles.title}>{order.title}</Text>

      <View className={styles.metaRow}>
        <Text className={styles.metaIcon}>📍</Text>
        <Text className={styles.metaText}>
          {order.location}
          {order.classroom ? ` · ${order.classroom}` : ''}
          {order.campus ? `（${order.campus}）` : ''}
        </Text>
      </View>
      <View className={styles.metaRow}>
        <Text className={styles.metaIcon}>⏰</Text>
        <Text className={styles.metaText}>{urgentText(order.expectTime)}</Text>
        <Text className={styles.publishTime}>{fromNow(order.createdAt)}发布</Text>
      </View>

      <View className={styles.footer}>
        {showPoster ? (
          <View className={styles.poster}>
            {order.posterAvatar ? (
              <Text className={styles.posterAvatarText}>
                {order.posterName.slice(0, 1)}
              </Text>
            ) : null}
            <Text className={styles.posterName}>{order.posterName}</Text>
          </View>
        ) : (
          <View />
        )}
        <View className={styles.priceWrap}>
          <View className={styles.priceMain}>
            <Text className={styles.priceSymbol}>¥</Text>
            <Text className={styles.priceValue}>{formatMoney(order.price)}</Text>
          </View>
          {topped ? (
            <Text className={styles.topText}>🔥 加急置顶中</Text>
          ) : (
            <Text className={styles.feeText}>接单免费 · 报酬线下结算</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default OrderCard;
