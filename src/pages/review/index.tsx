import React, { useState } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { api } from '@/services/api';
import RatingStars from '@/components/RatingStars';
import styles from './index.module.scss';

const TAG_OPTIONS: Record<'poster' | 'claimer', string[]> = {
  // 发单人评价接单人
  poster: ['准时送达', '认真负责', '沟通顺畅', '物品完好', '速度很快'],
  // 接单人评价发单人
  claimer: ['描述属实', '准时出现', '付款爽快', '沟通愉快', '礼貌友好']
};

const STAR_TEXT = ['', '很不满意', '不太满意', '一般般', '比较满意', '非常满意'];

const ReviewPage: React.FC = () => {
  const router = useRouter();
  const orderId = router.params.id || '';
  const toOpenid = router.params.to || '';
  const role = (router.params.role as 'poster' | 'claimer') || 'poster';

  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (stars < 1) {
      Taro.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      await api.submitReview({ orderId, toOpenid, role, stars, tags, content });
      Taro.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      console.error('[Review] submit failed:', err);
      Taro.showToast({ title: (err as Error).message || '评价失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className={styles.page}>
      <View className={styles.scoreCard}>
        <Text className={styles.scoreHint}>
          {role === 'poster' ? '评价本次为你服务的接单人' : '评价本次与你合作的发单人'}
        </Text>
        <RatingStars mode="input" value={stars} size={64} onChange={setStars} />
        <Text className={styles.scoreText}>{STAR_TEXT[stars]}</Text>
      </View>

      <View className={styles.card}>
        <Text className={styles.label}>快捷标签（可多选）</Text>
        <View className={styles.tagGrid}>
          {TAG_OPTIONS[role].map((tag) => (
            <View
              key={tag}
              className={classnames(styles.tag, tags.includes(tag) && styles.tagActive)}
              onClick={() => toggleTag(tag)}
            >
              <Text>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.card}>
        <Text className={styles.label}>文字评价（选填）</Text>
        <Textarea
          className={styles.textarea}
          placeholder="真实的评价会帮助更多同学做出判断，也是对方信誉的一部分"
          maxLength={300}
          value={content}
          onInput={(e) => setContent(e.detail.value)}
        />
        <Text className={styles.counter}>{content.length}/300</Text>
      </View>

      <Text className={styles.notice}>
        仅已完成订单可评价，每单限评一次；评价在双方均提交后才互相展示，防止恶意报复评分。
      </Text>

      <Button
        className={styles.submitBtn}
        loading={submitting}
        disabled={submitting}
        onClick={handleSubmit}
      >
        提交评价
      </Button>
    </View>
  );
};

export default ReviewPage;
