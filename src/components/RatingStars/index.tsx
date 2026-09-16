import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface RatingStarsProps {
  /** 显示模式：展示 / 可点击评分 */
  mode?: 'display' | 'input';
  value: number;
  size?: number; // rpx
  onChange?: (value: number) => void;
}

const STARS = [1, 2, 3, 4, 5];

const RatingStars: React.FC<RatingStarsProps> = ({
  mode = 'display',
  value,
  size = 28,
  onChange
}) => {
  const handleClick = (star: number) => {
    if (mode === 'input' && onChange) onChange(star);
  };

  return (
    <View className={styles.wrapper}>
      {STARS.map((star) => (
        <Text
          key={star}
          className={classnames(styles.star, mode === 'input' && styles.clickable, star <= value && styles.active)}
          style={{ fontSize: `${size}rpx` }}
          onClick={() => handleClick(star)}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

export default RatingStars;
