import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const AgreementPlaceholderPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <Text className={styles.emoji}>📄</Text>
      <Text className={styles.title}>平台服务与免责声明</Text>
      <Text className={styles.tip}>功能正在开发中...</Text>
    </View>
  );
};

export default AgreementPlaceholderPage;
