import { SELF_OPENID, assert, nextId, now, orders, refreshStats, reviews, users } from './mockDb';
import type { Review } from '@/types';

interface SubmitPayload {
  action: 'submit';
  orderId: string;
  toOpenid: string;
  role: 'poster' | 'claimer';
  stars: number;
  tags: string[];
  content: string;
}
interface ListPayload {
  action: 'list';
  openid: string;
}
type ReviewEvent = SubmitPayload | ListPayload;

export default async function reviewService(event: ReviewEvent): Promise<unknown> {
  if (event.action === 'list') {
    return {
      list: reviews
        .filter((r) => r.toOpenid === event.openid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    };
  }
  return submit(event);
}

function submit(event: SubmitPayload): Review {
  assert(event.stars >= 1 && event.stars <= 5, '请选择评分');
  const order = orders.find((o) => o._id === event.orderId);
  assert(!!order, '订单不存在');
  assert(order!.status === 'completed', '只有已完成的订单可以评价');

  // 同一订单同一角色仅可评价一次（防刷）
  const duplicated = reviews.some(
    (r) => r.orderId === event.orderId && r.fromOpenid === SELF_OPENID
  );
  assert(!duplicated, '您已评价过该订单');

  const me = users.find((u) => u.openid === SELF_OPENID)!;
  const review: Review = {
    _id: nextId('rev'),
    orderId: event.orderId,
    fromOpenid: SELF_OPENID,
    fromName: me.nickName,
    fromAvatar: me.avatar,
    toOpenid: event.toOpenid,
    stars: event.stars,
    tags: event.tags || [],
    content: event.content.trim(),
    role: event.role,
    createdAt: now()
  };
  reviews.unshift(review);
  refreshStats(event.toOpenid);
  console.info('[Review] submitted', review._id, 'stars=', review.stars);
  return review;
}
