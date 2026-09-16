import React, { useCallback, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import type { UserProfile, UserSort } from '@/types';
import { api } from '@/services/api';
import { useUserStore } from '@/store/user';
import UserCard from '@/components/UserCard';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const SORT_OPTIONS: { value: UserSort; label: string }[] = [
  { value: 'score', label: '综合评分' },
  { value: 'accepted', label: '接单量' },
  { value: 'finishRate', label: '完成率' },
  { value: 'response', label: '响应最快' }
];

const FindPage: React.FC = () => {
  const login = useUserStore((s) => s.login);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<UserSort>('score');

  const fetchUsers = useCallback(async (kw: string, sortBy: UserSort) => {
    setLoading(true);
    try {
      const res = await api.searchUsers({ keyword: kw, sort: sortBy });
      setUsers(res.list);
    } catch (err) {
      console.error('[Find] search users failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    login();
    fetchUsers(keyword, sort);
  });

  usePullDownRefresh(() => {
    fetchUsers(keyword, sort).finally(() => Taro.stopPullDownRefresh());
  });

  const handleSortChange = (value: UserSort) => {
    setSort(value);
    fetchUsers(keyword, value);
  };

  const goProfile = (user: UserProfile) => {
    Taro.navigateTo({ url: `/pages/profile/index?openid=${user.openid}` });
  };

  return (
    <View className={styles.page}>
      <View className={styles.tipBanner}>
        <Text className={styles.tipIcon}>💡</Text>
        <Text className={styles.tipText}>
          按评分、接单量、完成率挑选靠谱帮手，信誉分低于 80 将被限制接单
        </Text>
      </View>

      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          placeholder="搜索帮手昵称"
          value={keyword}
          confirmType="search"
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={() => fetchUsers(keyword, sort)}
        />
      </View>

      <ScrollView scrollX className={styles.sortScroll} enhanced showScrollbar={false}>
        {SORT_OPTIONS.map((item) => (
          <View
            key={item.value}
            className={classnames(styles.sortChip, sort === item.value && styles.sortChipActive)}
            onClick={() => handleSortChange(item.value)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View className={styles.listWrap}>
        {users.length === 0 && !loading ? (
          <Empty icon="🧑‍🤝‍🧑" text="没有找到符合条件的帮手" />
        ) : (
          users.map((user, index) => (
            <UserCard
              key={user.openid}
              user={user}
              rank={sort === 'score' ? index + 1 : undefined}
              onClick={goProfile}
            />
          ))
        )}
        {loading ? <Text className={styles.loadingText}>加载中...</Text> : null}
      </View>
    </View>
  );
};

export default FindPage;
