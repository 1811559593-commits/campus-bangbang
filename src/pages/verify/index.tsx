import React, { useState } from 'react';
import { View, Text, Input, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { api } from '@/services/api';
import styles from './index.module.scss';

const SCHOOLS = [
  { name: '传媒大学', hint: '学号为12位数字，如 202316153001' }
];

const VerifyPage: React.FC = () => {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const login = useUserStore((s) => s.login);

  const [schoolIdx, setSchoolIdx] = useState(0);
  const [studentNo, setStudentNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedSchool = SCHOOLS[schoolIdx];

  const handleSubmit = async () => {
    if (!studentNo.trim()) {
      Taro.showToast({ title: '请输入学号', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.submitVerify(selectedSchool.name, studentNo.trim());
      setProfile(updated);
      Taro.showToast({ title: '认证成功', icon: 'success' });
      await login(true);
      setTimeout(() => Taro.navigateBack(), 1000);
    } catch (err) {
      Taro.showToast({
        title: (err as Error).message || '认证失败',
        icon: 'none'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 已认证状态
  if (profile?.verified) {
    return (
      <View className={styles.page}>
        <View className={styles.successCard}>
          <Text className={styles.successIcon}>✅</Text>
          <Text className={styles.successTitle}>已完成学生认证</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>学校</Text>
            <Text className={styles.infoValue}>{profile.school || '未设置'}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>学号</Text>
            <Text className={styles.infoValue}>{profile.studentNo || '—'}</Text>
          </View>
        </View>
        <Text className={styles.tip}>
          已认证用户可在大厅接单，他人可在找帮手页查看你的信誉信息。
        </Text>
      </View>
    );
  }

  // 未认证 → 填写表单
  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        <View className={styles.formItem}>
          <Text className={styles.label}>选择学校</Text>
          <Picker
            mode="selector"
            range={SCHOOLS.map((s) => s.name)}
            value={schoolIdx}
            onChange={(e) => setSchoolIdx(Number(e.detail.value))}
          >
            <View className={styles.pickerValue}>{selectedSchool.name}</View>
          </Picker>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>学号</Text>
          <Input
            className={styles.input}
            type="number"
            value={studentNo}
            placeholder="请输入学号"
            onInput={(e) => setStudentNo(e.detail.value)}
          />
          <Text className={styles.hint}>{selectedSchool.hint}</Text>
        </View>
      </View>

      <Button
        className={styles.submitBtn}
        loading={submitting}
        disabled={submitting}
        onClick={handleSubmit}
      >
        提交认证
      </Button>

      <Text className={styles.tip}>
        认证后，你的学校信息将公开展示，其他用户可据此判断你是否为同校同学。
      </Text>
    </View>
  );
};

export default VerifyPage;
