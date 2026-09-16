import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const ReportPlaceholderPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <Text className={styles.emoji}>🛡️</Text>
      <Text className={styles.title}>举报申诉</Text>
      <Text className={styles.tip}>功能正在开发中...</Text>
    </View>
  );
};

export default ReportPlaceholderPage;
