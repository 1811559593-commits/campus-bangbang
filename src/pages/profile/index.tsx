import React, { useState } from 'react';
import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { api } from '@/services/api';
import styles from './index.module.scss';

const FIELDS = [
  { key: 'nickName', label: '昵称', placeholder: '请输入昵称', maxlength: 20 },
  { key: 'contact', label: '微信号', placeholder: '接单时同步给发单人', maxlength: 30 },
  { key: 'phone', label: '手机号', placeholder: '微信号备用联系方式', maxlength: 11 },
  { key: 'school', label: '学校', placeholder: '请输入学校名称', maxlength: 30 },
  { key: 'campus', label: '校区', placeholder: '如：东校区', maxlength: 20 }
] as const;

const ProfileEditPage: React.FC = () => {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const login = useUserStore((s) => s.login);

  const [form, setForm] = useState<Record<string, string>>({
    nickName: profile?.nickName || '',
    contact: profile?.contact || '',
    phone: profile?.phone || '',
    school: profile?.school || '',
    campus: profile?.campus || '',
    bio: profile?.bio || ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!form.nickName.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        nickName: form.nickName.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        school: form.school.trim(),
        campus: form.campus.trim(),
        bio: form.bio.trim()
      });
      setProfile(updated);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      // 重新拉取登录态以同步 stats
      await login(true);
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      Taro.showToast({
        title: (err as Error).message || '保存失败',
        icon: 'none'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        {FIELDS.map((field) => (
          <View key={field.key} className={styles.formItem}>
            <Text className={styles.label}>{field.label}</Text>
            <Input
              className={styles.input}
              type={field.key === 'phone' ? 'number' : 'text'}
              value={form[field.key]}
              placeholder={field.placeholder}
              maxlength={field.maxlength}
              onInput={(e) => handleChange(field.key, e.detail.value)}
            />
          </View>
        ))}
        <View className={styles.formItem}>
          <Text className={styles.label}>简介</Text>
          <Textarea
            className={styles.textarea}
            value={form.bio}
            placeholder="一句话介绍自己"
            maxlength={100}
            onInput={(e) => handleChange('bio', e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.tipBox}>
        <Text className={styles.tipText}>
          ⚠️ 接单前请务必填写「微信号」或「手机号」，接单时将同步给发单人方便联系。
        </Text>
      </View>

      <Button
        className={styles.saveBtn}
        loading={saving}
        disabled={saving}
        onClick={handleSave}
      >
        保存
      </Button>
    </View>
  );
};

export default ProfileEditPage;
