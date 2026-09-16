import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface EmptyProps {
  icon?: string;
  text?: string;
}

const Empty: React.FC<EmptyProps> = ({ icon = '📭', text = '暂无内容' }) => {
  return (
    <View className={styles.wrapper}>
      <Text className={styles.icon}>{icon}</Text>
      <Text className={styles.text}>{text}</Text>
    </View>
  );
};

export default Empty;
