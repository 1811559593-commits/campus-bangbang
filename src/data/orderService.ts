import dayjs from 'dayjs';
import {
  SELF_OPENID,
  assert,
  nextId,
  now,
  orders,
  reviews,
  setStatus,
  users
} from './mockDb';
import type { Order, OrderQuery, Report } from '@/types';
import { isTopped, ORDER_TYPE_TEXT } from '@/utils/format';
import type { ClaimerCredit, DetailResult, ListResult, PublishPayload } from '@/services/api';

type OrderEvent =
  | { action: 'list'; query: OrderQuery }
  | { action: 'my'; role: 'poster' | 'claimer' }
  | { action: 'detail'; id: string }
  | { action: 'publish'; payload: PublishPayload }
  | { action: 'claim'; id: string }
  | { action: 'confirmClaim'; id: string }
  | { action: 'finish'; id: string; proofNote: string }
  | { action: 'confirm'; id: string }
  | { action: 'cancel'; id: string; reason: string }
  | { action: 'report'; targetOpenid: string; reason: string; orderId?: string };

const reports: Report[] = [];

export default async function orderService(event: OrderEvent): Promise<unknown> {
  switch (event.action) {
    case 'list':
      return listOrders(event.query || {});
    case 'my':
      return myOrders(event.role);
    case 'detail':
      return detail(event.id);
    case 'publish':
      return publish(event.payload);
    case 'claim':
      return claim(event.id);
    case 'confirmClaim':
      return confirmClaim(event.id);
    case 'finish':
      return finish(event.id, event.proofNote);
    case 'confirm':
      return confirm(event.id);
    case 'cancel':
      return cancel(event.id, event.reason);
    case 'report':
      return report(event.targetOpenid, event.reason, event.orderId);
    default:
      throw new Error('未知操作');
  }
}

function listOrders(query: OrderQuery): ListResult {
  let list = orders.filter((o) => o.status === 'pending');
  if (query.type && query.type !== 'all') {
    list = list.filter((o) => o.type === query.type);
  }
  if (query.campus) {
    list = list.filter((o) => o.campus === query.campus);
  }
  if (query.keyword) {
    const kw = query.keyword.trim();
    list = list.filter(
      (o) => o.title.includes(kw) || o.detail.includes(kw) || o.location.includes(kw)
    );
  }
  const sorted = [...list];
  if (query.sort === 'priceDesc') {
    sorted.sort((a, b) => b.price - a.price);
  } else if (query.sort === 'urgent') {
    sorted.sort((a, b) => dayjs(a.expectTime).valueOf() - dayjs(b.expectTime).valueOf());
  } else {
    sorted.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }
  // 加急卡置顶订单永远排在最前
  sorted.sort((a, b) => Number(isTopped(b)) - Number(isTopped(a)));
  return { list: sorted, total: sorted.length };
}

function myOrders(role: 'poster' | 'claimer'): ListResult {
  const list =
    role === 'poster'
      ? orders.filter((o) => o.posterOpenid === SELF_OPENID)
      : orders.filter((o) => o.claimerOpenid === SELF_OPENID);
  list.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  return { list, total: list.length };
}

function detail(id: string): DetailResult {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在或已被删除');
  const isPoster = order.posterOpenid === SELF_OPENID;
  const isClaimer = order.claimerOpenid === SELF_OPENID;
  // 联系方式：发单人本人始终可见；接单人仅在发单人确认选择（claimed）后可见
  const canSeeContact =
    isPoster || (isClaimer && ['claimed', 'submitted', 'completed'].includes(order.status));
  const myReview = reviews.find((r) => r.orderId === id && r.fromOpenid === SELF_OPENID);

  // 发单人查看已接单订单时，返回接单人联系方式 + 信用
  let claimerContact: string | undefined;
  let claimerCredit: ClaimerCredit | undefined;
  if (isPoster && order.claimerOpenid && order.status !== 'pending' && order.status !== 'cancelled') {
    const claimer = users.find((u) => u.openid === order.claimerOpenid);
    if (claimer) {
      claimerContact = order.claimerContact || claimer.contact || claimer.phone;
      claimerCredit = {
        creditScore: claimer.creditScore,
        avgScore: claimer.stats.avgScore,
        ratingCount: claimer.stats.ratingCount,
        acceptedCount: claimer.stats.acceptedCount,
        finishedCount: claimer.stats.finishedCount,
        finishRate: claimer.stats.finishRate
      };
    }
  }

  return {
    order,
    contact: canSeeContact ? order.contact : undefined,
    claimerContact,
    claimerCredit,
    myReview
  };
}

function publish(payload: PublishPayload): Order {
  assert(!!payload.title.trim(), '请填写订单标题');
  assert(payload.price > 0, '报酬金额需大于 0');
  assert(!!payload.expectTime, '请选择期望完成时间');
  const me = users.find((u) => u.openid === SELF_OPENID)!;
  const order: Order = {
    _id: nextId('ord'),
    posterOpenid: SELF_OPENID,
    posterName: me.nickName,
    posterAvatar: me.avatar,
    type: payload.type,
    title: payload.title.trim(),
    detail: payload.detail.trim(),
    school: payload.school || me.school,
    campus: payload.campus || me.campus,
    location: payload.location.trim(),
    classroom: payload.classroom?.trim() || '',
    expectTime: payload.expectTime,
    price: payload.price,
    infoFeeRate: 0,
    infoFee: 0,
    status: 'pending',
    contact: payload.contact.trim(),
    createdAt: now()
  };
  orders.unshift(order);
  console.info('[Order] published', order._id, ORDER_TYPE_TEXT[order.type]);
  return order;
}

// 免费申请接单：pending -> applied
function claim(id: string): Order {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在');
  assert(order!.status === 'pending', '手慢了，订单已被接单');
  assert(order!.posterOpenid !== SELF_OPENID, '不能接自己发布的订单');
  const me = users.find((u) => u.openid === SELF_OPENID)!;
  assert(me.creditScore >= 80, '信誉分过低（低于80），暂时无法接单');
  const myContact = (me.contact || '').trim() || (me.phone || '').trim();
  assert(!!myContact, '请先在个人中心填写联系方式后再接单');

  setStatus(order!, 'applied', {
    claimerOpenid: SELF_OPENID,
    claimerName: me.nickName,
    claimerContact: myContact
  });
  console.info('[Order] mock claim applied (free)', order!._id);
  return order!;
}

// 发单人确认选择：applied -> claimed
function confirmClaim(id: string): Order {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在');
  assert(order!.posterOpenid === SELF_OPENID, '只有发单人可以确认接单人');
  assert(order!.status === 'applied', '当前状态不能确认接单');
  return setStatus(order!, 'claimed', { claimedAt: now() });
}

function finish(id: string, proofNote: string): Order {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在');
  assert(order!.claimerOpenid === SELF_OPENID, '只有接单人可以提交完成');
  assert(order!.status === 'claimed', '当前状态不能提交完成');
  return setStatus(order!, 'submitted', { submittedAt: now(), proofNote });
}

function confirm(id: string): Order {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在');
  assert(order!.posterOpenid === SELF_OPENID, '只有发单人可以确认');
  assert(order!.status === 'submitted', '接单人尚未提交完成');
  return setStatus(order!, 'completed', { completedAt: now() });
}

function cancel(id: string, reason: string): Order {
  const order = orders.find((o) => o._id === id);
  assert(!!order, '订单不存在');
  assert(
    order!.posterOpenid === SELF_OPENID || order!.claimerOpenid === SELF_OPENID,
    '只有订单双方可以取消'
  );
  assert(['pending', 'applied', 'claimed'].includes(order!.status), '当前状态无法取消');
  if (order!.status === 'claimed' && !reason) {
    assert(false, '确认接单后取消需填写原因');
  }
  return setStatus(order!, 'cancelled');
}

function report(targetOpenid: string, reason: string, orderId?: string): { id: string } {
  assert(!!reason.trim(), '请填写举报原因');
  const report: Report = {
    _id: nextId('rpt'),
    orderId,
    reporterOpenid: SELF_OPENID,
    targetOpenid,
    reason: reason.trim(),
    status: 'pending',
    createdAt: now()
  };
  reports.unshift(report);
  console.info('[Report] created', report._id);
  return { id: report._id };
}
