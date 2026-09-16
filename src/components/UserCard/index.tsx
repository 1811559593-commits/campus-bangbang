import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import type { UserProfile } from '@/types';
import RatingStars from '@/components/RatingStars';
import styles from './index.module.scss';

interface UserCardProps {
  user: UserProfile;
  rank?: number;
  onClick?: (user: UserProfile) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, rank, onClick }) => {
  return (
    <View className={styles.card} onClick={() => onClick?.(user)}>
      {rank ? (
        <View
          className={classnames(
            styles.rank,
            rank === 1 && styles.rankGold,
            rank === 2 && styles.rankSilver,
            rank === 3 && styles.rankBronze
          )}
        >
          <Text>{rank}</Text>
        </View>
      ) : null}

      {user.avatar ? (
        <Image className={styles.avatar} src={user.avatar} mode="aspectFill" />
      ) : (
        <View className={styles.avatarPlaceholder}>
          <Text>{user.nickName.slice(0, 1)}</Text>
        </View>
      )}

      <View className={styles.main}>
        <View className={styles.nameRow}>
          <Text className={styles.name}>{user.nickName}</Text>
          {user.verified ? (
            <View className={styles.verified}>
              <Text>已认证</Text>
            </View>
          ) : null}
        </View>
        <View className={styles.scoreRow}>
          <RatingStars value={Math.round(user.stats.avgScore)} size={22} />
          <Text className={styles.scoreNum}>{user.stats.avgScore.toFixed(1)}</Text>
        </View>
        {user.bio ? <Text className={styles.bio}>{user.bio}</Text> : null}
        <View className={styles.statsRow}>
          <Text className={styles.statItem}>接单 {user.stats.acceptedCount}</Text>
          <Text className={styles.statDivider}>|</Text>
          <Text className={styles.statItem}>完成率 {user.stats.finishRate}%</Text>
          <Text className={styles.statDivider}>|</Text>
          <Text className={styles.statItem}>{user.stats.avgResponseMin}分钟响应</Text>
        </View>
      </View>

      <View className={styles.creditWrap}>
        <Text className={styles.creditLabel}>信誉分</Text>
        <Text
          className={classnames(
            styles.creditValue,
            user.creditScore < 80 && styles.creditLow
          )}
        >
          {user.creditScore}
        </Text>
      </View>
    </View>
  );
};

export default UserCard;
