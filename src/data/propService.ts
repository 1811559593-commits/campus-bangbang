import dayjs from 'dayjs';
import { SELF_OPENID, assert, orders } from './mockDb';
import { isTopped, URGENT_CARD_PRICE, URGENT_TOP_HOURS } from '@/utils/format';
import type { UrgentCardResult } from '@/services/api';

type PropEvent = { action: 'buyTop'; orderId: string };

export default async function propService(event: PropEvent): Promise<unknown> {
  switch (event.action) {
    case 'buyTop':
      return buyTop(event.orderId);
    default:
      throw new Error('未知操作');
  }
}

function buyTop(orderId: string): UrgentCardResult {
  const order = orders.find((o) => o._id === orderId);
  assert(!!order, '订单不存在');
  assert(order!.posterOpenid === SELF_OPENID, '只有发单人可以加急置顶');
  assert(['pending', 'applied'].includes(order!.status), '订单当前状态不能加急');
  assert(!isTopped(order!), '该订单已在加急置顶中');

  const topUntil = dayjs().add(URGENT_TOP_HOURS, 'hour').toISOString();
  order!.topUntil = topUntil;
  console.info('[Prop] mock urgent card granted:', order!._id, topUntil);
  return { paid: true, payParams: null, amount: URGENT_CARD_PRICE, topUntil };
}
