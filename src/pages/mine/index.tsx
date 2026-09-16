import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  url: string;
  adminOnly?: boolean;
}

const MENU: MenuItem[] = [
  { key: 'editProfile', icon: '✏️', label: '编辑资料', url: '/pages/profile/index' },
  { key: 'verify', icon: '🎓', label: '学生认证', url: '/pages/verify/index' },
  { key: 'agreement', icon: '📄', label: '平台服务与免责声明', url: '/pages/agreement/index' },
  { key: 'admin', icon: '🛡️', label: '管理员后台', url: '/pages/admin/index', adminOnly: true }
];

const MinePage: React.FC = () => {
  const profile = useUserStore((s) => s.profile);
  const login = useUserStore((s) => s.login);

  useDidShow(() => {
    login(true);
  });

  const stats = profile?.stats;

  const handleMenu = (item: MenuItem) => {
    Taro.navigateTo({ url: item.url });
  };

  return (
    <View className={styles.page}>
      <View className={styles.headerCard}>
        <View className={styles.userRow}>
          {profile?.avatar ? (
            <Image className={styles.avatar} src={profile.avatar} mode="aspectFill" />
          ) : (
            <View className={styles.avatarPlaceholder}>
              <Text>{profile?.nickName?.slice(0, 1) || '?'}</Text>
            </View>
          )}
          <View className={styles.userInfo}>
            <View className={styles.nameRow}>
              <Text className={styles.name}>{profile?.nickName || '未登录'}</Text>
              {profile?.verified ? (
                <View className={styles.verifiedBadge}>
                  <Text>已认证</Text>
                </View>
              ) : (
                <View className={styles.unverifiedBadge}>
                  <Text>未认证</Text>
                </View>
              )}
            </View>
            <Text className={styles.school}>
              {profile?.school || '未设置学校'}
              {profile?.campus ? ` · ${profile.campus}` : ''}
            </Text>
          </View>
        </View>

        <View className={styles.creditRow}>
          <View className={styles.creditItem}>
            <Text className={styles.creditValue}>{profile?.creditScore ?? 100}</Text>
            <Text className={styles.creditLabel}>信誉分</Text>
          </View>
          <View className={styles.creditDivider} />
          <View className={styles.creditItem}>
            <Text className={styles.creditValue}>{stats ? stats.avgScore.toFixed(1) : '5.0'}</Text>
            <Text className={styles.creditLabel}>综合评分</Text>
          </View>
          <View className={styles.creditDivider} />
          <View className={styles.creditItem}>
            <Text className={styles.creditValue}>{stats?.acceptedCount ?? 0}</Text>
            <Text className={styles.creditLabel}>累计接单</Text>
          </View>
          <View className={styles.creditDivider} />
          <View className={styles.creditItem}>
            <Text className={styles.creditValue}>{stats?.finishRate ?? 0}%</Text>
            <Text className={styles.creditLabel}>完成率</Text>
          </View>
        </View>
      </View>

      <View className={styles.noticeCard}>
        <Text className={styles.noticeIcon}>ℹ️</Text>
        <Text className={styles.noticeText}>
          平台仅提供信息撮合与信誉记录，订单报酬由双方线下自行结算，平台不经手、不担保。
        </Text>
      </View>

      <View className={styles.menuCard}>
        {MENU.filter((item) => !item.adminOnly || profile?.isAdmin).map((item) => (
          <View key={item.key} className={styles.menuItem} onClick={() => handleMenu(item)}>
            <Text className={styles.menuIcon}>{item.icon}</Text>
            <Text className={styles.menuLabel}>{item.label}</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        ))}
      </View>

      <Button
        className={classnames(styles.logoutBtn)}
        onClick={() => Taro.showToast({ title: '演示环境无需退出', icon: 'none' })}
      >
        切换账号
      </Button>
    </View>
  );
};

export default MinePage;
