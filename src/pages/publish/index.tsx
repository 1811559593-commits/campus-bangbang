import React, { useState } from 'react';
import { View, Text, Input, Textarea, Picker, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { OrderType, UserProfile } from '@/types';
import { api, type PublishPayload } from '@/services/api';
import { useUserStore } from '@/store/user';
import { ORDER_TYPE_OPTIONS } from '@/utils/format';
import styles from './index.module.scss';

const PublishPage: React.FC = () => {
  const login = useUserStore((s) => s.login);
  const profile = useUserStore((s) => s.profile);
  const [type, setType] = useState<OrderType>('express');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [campus, setCampus] = useState('');
  const [location, setLocation] = useState('');
  const [classroom, setClassroom] = useState('');
  const [date, setDate] = useState(dayjs().add(2, 'hour').format('YYYY-MM-DD'));
  const [time, setTime] = useState(dayjs().add(2, 'hour').format('HH:mm'));
  const [price, setPrice] = useState('5');
  const [contact, setContact] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useDidShow(() => {
    login().then((p: UserProfile | null) => {
      if (p?.contact && !contact) setContact(p.contact);
      if (p?.campus && !campus) setCampus(p.campus);
    });
  });

  const priceNum = Number(price) || 0;

  const validate = (): string => {
    if (!title.trim()) return '请填写订单标题';
    if (!location.trim()) return '请填写交付地点';
    if (priceNum <= 0) return '请填写大于 0 的报酬金额';
    if (!contact.trim()) return '请填写您的联系方式（微信号/手机号）';
    if (!agreed) return '请先阅读并同意平台免责声明';
    if (dayjs(`${date}T${time}`).isBefore(dayjs())) return '期望时间不能早于当前时间';
    return '';
  };

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) {
      Taro.showToast({ title: errMsg, icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: PublishPayload = {
        type,
        title,
        detail,
        school: profile?.school || '示范大学',
        campus,
        location,
        classroom,
        expectTime: dayjs(`${date}T${time}:00`).toISOString(),
        price: priceNum,
        contact
      };
      await api.publishOrder(payload);
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/orders/index' });
      }, 800);
    } catch (err) {
      console.error('[Publish] submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const goAgreement = () => {
    Taro.navigateTo({ url: '/pages/agreement/index' });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.card}>
        <Text className={styles.label}>代办类型</Text>
        <View className={styles.typeGrid}>
          {ORDER_TYPE_OPTIONS.map((item) => (
            <View
              key={item.value}
              className={classnames(styles.typeChip, type === item.value && styles.typeChipActive)}
              onClick={() => setType(item.value)}
            >
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.card}>
        <View className={styles.field}>
          <Text className={styles.label}>
            <Text className={styles.required}>*</Text>标题
          </Text>
          <Input
            className={styles.input}
            placeholder="一句话说清要做什么，如：东门代取快递"
            maxLength={40}
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>
        <View className={styles.field}>
          <Text className={styles.label}>详细说明</Text>
          <Textarea
            className={styles.textarea}
            placeholder="取件码、口味、交付要求等补充信息"
            maxLength={300}
            value={detail}
            onInput={(e) => setDetail(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.card}>
        <View className={styles.fieldRow}>
          <View className={styles.fieldHalf}>
            <Text className={styles.label}>校区</Text>
            <Input
              className={styles.input}
              placeholder="如：东区"
              value={campus}
              onInput={(e) => setCampus(e.detail.value)}
            />
          </View>
          <View className={styles.fieldHalf}>
            <Text className={styles.label}>
              <Text className={styles.required}>*</Text>地点
            </Text>
            <Input
              className={styles.input}
              placeholder="如：东区3号宿舍楼"
              value={location}
              onInput={(e) => setLocation(e.detail.value)}
            />
          </View>
        </View>
        <View className={styles.field}>
          <Text className={styles.label}>教室（选填）</Text>
          <Input
            className={styles.input}
            placeholder="如：教三 203"
            value={classroom}
            onInput={(e) => setClassroom(e.detail.value)}
          />
        </View>
        <View className={styles.fieldRow}>
          <Picker mode="date" value={date} onChange={(e) => setDate(e.detail.value)}>
            <View className={styles.pickerBox}>
              <Text className={styles.label}>日期</Text>
              <Text className={styles.pickerValue}>{date}</Text>
            </View>
          </Picker>
          <Picker mode="time" value={time} onChange={(e) => setTime(e.detail.value)}>
            <View className={styles.pickerBox}>
              <Text className={styles.label}>时间</Text>
              <Text className={styles.pickerValue}>{time}</Text>
            </View>
          </Picker>
        </View>
      </View>

      <View className={styles.card}>
        <View className={styles.field}>
          <Text className={styles.label}>
            <Text className={styles.required}>*</Text>线下报酬（元）
          </Text>
          <Input
            className={styles.priceInput}
            type="digit"
            placeholder="0.00"
            value={price}
            onInput={(e) => setPrice(e.detail.value)}
          />
        </View>
        <View className={styles.feeTip}>
          <Text className={styles.feeTipText}>
            接单免费：接单人申请后由你确认选择，确认后双方联系方式互通；报酬线下自行结算
          </Text>
        </View>
        <View className={styles.field}>
          <Text className={styles.label}>
            <Text className={styles.required}>*</Text>联系方式（确认接单人后向对方公开）
          </Text>
          <Input
            className={styles.input}
            placeholder="微信号 / 手机号"
            value={contact}
            onInput={(e) => setContact(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.agreementRow} onClick={() => setAgreed(!agreed)}>
        <View className={classnames(styles.checkbox, agreed && styles.checkboxChecked)}>
          {agreed ? <Text className={styles.checkIcon}>✓</Text> : null}
        </View>
        <Text className={styles.agreementText}>
          我已阅读并同意
          <Text className={styles.agreementLink} onClick={goAgreement}>
            《平台服务与免责声明》
          </Text>
          ，了解平台仅提供信息撮合与信誉记录
        </Text>
      </View>

      <Button
        className={styles.submitBtn}
        loading={submitting}
        disabled={submitting}
        onClick={handleSubmit}
      >
        确认发布
      </Button>
    </ScrollView>
  );
};

export default PublishPage;
