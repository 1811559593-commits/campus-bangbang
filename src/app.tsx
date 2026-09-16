import React, { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useDidShow, useDidHide } from '@tarojs/taro';
// 全局样式
import './app.scss';

function App(props) {
  useEffect(() => {
    // 云开发仅在微信小程序端初始化
    // init 失败时由 services/cloud.ts 自动降级演示模式
    if (process.env.TARO_ENV === 'weapp') {
      try {
        Taro.cloud.init({ env: 'campus-prod-d7g15118eda769bee', traceUser: true });
        console.info('[App] cloud init done');
      } catch (err) {
        console.warn('[App] cloud init skipped, demo mode will be used:', err);
      }
    }
  }, []);

  // 对应 onShow
  useDidShow(() => {});

  // 对应 onHide
  useDidHide(() => {});

  return props.children;
}

export default App;
