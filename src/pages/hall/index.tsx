import React, { useCallback, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import type { Order, OrderQuery, OrderType } from '@/types';
import { api } from '@/services/api';
import { useUserStore } from '@/store/user';
import { ORDER_TYPE_OPTIONS } from '@/utils/format';
import OrderCard from '@/components/OrderCard';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

type TypeFilter = OrderType | 'all';
type SortKey = NonNullable<OrderQuery['sort']>;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: '最新发布' },
  { value: 'urgent', label: '最紧急' },
  { value: 'priceDesc', label: '价格最高' }
];

const HallPage: React.FC = () => {
  const login = useUserStore((s) => s.login);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortKey>('latest');

  const fetchList = useCallback(
    async (query: OrderQuery) => {
      setLoading(true);
      try {
        const res = await api.listOrders(query);
        setOrders(res.list);
      } catch (err) {
        console.error('[Hall] fetch orders failed:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useDidShow(() => {
    login();
    fetchList({ keyword, type, sort });
  });

  usePullDownRefresh(() => {
    fetchList({ keyword, type, sort }).finally(() => Taro.stopPullDownRefresh());
  });

  const handleSearch = () => {
    fetchList({ keyword, type, sort });
  };

  const handleTypeChange = (value: TypeFilter) => {
    setType(value);
    fetchList({ keyword, type: value, sort });
  };

  const handleSortChange = (value: SortKey) => {
    setSort(value);
    fetchList({ keyword, type, sort: value });
  };

  const goDetail = (order: Order) => {
    Taro.navigateTo({ url: `/pages/orderDetail/index?id=${order._id}` });
  };

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          placeholder="搜索标题、地点、教室"
          value={keyword}
          confirmType="search"
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={handleSearch}
        />
      </View>

      <View className={styles.filterBar}>
        <ScrollView scrollX className={styles.typeScroll} enhanced showScrollbar={false}>
          <View
            className={classnames(styles.typeChip, type === 'all' && styles.typeChipActive)}
            onClick={() => handleTypeChange('all')}
          >
            <Text>全部</Text>
          </View>
          {ORDER_TYPE_OPTIONS.map((item) => (
            <View
              key={item.value}
              className={classnames(styles.typeChip, type === item.value && styles.typeChipActive)}
              onClick={() => handleTypeChange(item.value)}
            >
              <Text>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.sortBar}>
        {SORT_OPTIONS.map((item) => (
          <View
            key={item.value}
            className={classnames(styles.sortItem, sort === item.value && styles.sortItemActive)}
            onClick={() => handleSortChange(item.value)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.listWrap}>
        {orders.length === 0 && !loading ? (
          <Empty icon="📋" text="暂时没有匹配的订单，下拉刷新试试" />
        ) : (
          orders.map((order) => <OrderCard key={order._id} order={order} onClick={goDetail} />)
        )}
        {loading ? <Text className={styles.loadingText}>加载中...</Text> : null}
      </View>
    </View>
  );
};

export default HallPage;
