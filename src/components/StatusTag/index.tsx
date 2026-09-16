import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { OrderStatus } from '@/types';
import { ORDER_STATUS_TEXT } from '@/utils/format';
import styles from './index.module.scss';

interface StatusTagProps {
  status: OrderStatus;
}

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  return (
    <View className={classnames(styles.tag, styles[status])}>
      <Text>{ORDER_STATUS_TEXT[status]}</Text>
    </View>
  );
};

export default StatusTag;
