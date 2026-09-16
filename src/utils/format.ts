import dayjs from 'dayjs';
import type { OrderStatus, OrderType } from '@/types';

/** 信息费率：5% */
export const INFO_FEE_RATE = 0.05;
/** 单笔信息费最低 0.1 元 */
export const MIN_INFO_FEE = 0.1;

/** 计算信息费：四舍五入到分，最低 0.1 元 */
export function calcInfoFee(price: number): number {
  const fee = Math.round(price * INFO_FEE_RATE * 100) / 100;
  return Math.max(MIN_INFO_FEE, fee);
}

/** 金额展示（保留两位有效小数） */
export function formatMoney(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/** 完整时间 */
export function formatTime(iso?: string): string {
  if (!iso) return '';
  return dayjs(iso).format('MM-DD HH:mm');
}

/** 相对时间（大厅列表用） */
export function fromNow(iso?: string): string {
  if (!iso) return '';
  const diffMin = dayjs().diff(dayjs(iso), 'minute');
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  return dayjs(iso).format('MM-DD HH:mm');
}

/** 距离期望时间的紧急度文案 */
export function urgentText(iso: string): string {
  const diffMin = dayjs(iso).diff(dayjs(), 'minute');
  if (diffMin < 0) return '已过期';
  if (diffMin < 60) return `${diffMin}分钟内`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}小时内`;
  return `${Math.floor(diffMin / 60 / 24)}天后`;
}

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: '待接单',
  claimed: '已接单',
  submitted: '待确认',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '纠纷中'
};

export const ORDER_TYPE_TEXT: Record<OrderType, string> = {
  express: '代取快递',
  meal: '代买饭餐',
  delivery: '送取资料',
  seat: '教室占座',
  errand: '跑腿代办',
  other: '其他'
};

export const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: 'express', label: '代取快递' },
  { value: 'meal', label: '代买饭餐' },
  { value: 'delivery', label: '送取资料' },
  { value: 'seat', label: '教室占座' },
  { value: 'errand', label: '跑腿代办' },
  { value: 'other', label: '其他' }
];
