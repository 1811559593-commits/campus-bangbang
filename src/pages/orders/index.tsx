import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import type { Order } from '@/types';
import { api } from '@/services/api';
import { useUserStore } from '@/store/user';
import OrderCard from '@/components/OrderCard';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

type Role = 'poster' | 'claimer';

const OrdersPage: React.FC = () => {
  const login = useUserStore((s) => s.login);
  const [role, setRole] = useState<Role>('poster');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async (nextRole: Role) => {
    setLoading(true);
    try {
      const res = await api.myOrders(nextRole);
      setOrders(res.list);
    } catch (err) {
      console.error('[Orders] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    login();
    fetchOrders(role);
  });

  const handleRoleChange = (next: Role) => {
    setRole(next);
    fetchOrders(next);
  };

  const goDetail = (order: Order) => {
    Taro.navigateTo({ url: `/pages/orderDetail/index?id=${order._id}` });
  };

  return (
    <View className={styles.page}>
      <View className={styles.tabBar}>
        <View
          className={classnames(styles.tab, role === 'poster' && styles.tabActive)}
          onClick={() => handleRoleChange('poster')}
        >
          <Text>我发出的</Text>
        </View>
        <View
          className={classnames(styles.tab, role === 'claimer' && styles.tabActive)}
          onClick={() => handleRoleChange('claimer')}
        >
          <Text>我接单的</Text>
        </View>
      </View>

      <View className={styles.listWrap}>
        {orders.length === 0 && !loading ? (
          <Empty
            icon="📝"
            text={role === 'poster' ? '还没有发布过订单，去发布一个吧' : '还没有接过单，去大厅看看'}
          />
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              showPoster={role === 'claimer'}
              onClick={goDetail}
            />
          ))
        )}
      </View>
    </View>
  );
};

export default OrdersPage;
