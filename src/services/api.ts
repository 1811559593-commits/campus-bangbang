import { callFunction } from './cloud';
import type {
  ClaimResult,
  Order,
  OrderQuery,
  OrderType,
  Review,
  UserProfile,
  UserSort
} from '@/types';

/** 发布订单入参 */
export interface PublishPayload {
  type: OrderType;
  title: string;
  detail: string;
  school: string;
  campus?: string;
  location: string;
  classroom?: string;
  expectTime: string;
  price: number;
  contact: string;
}

/** 列表返回 */
export interface ListResult {
  list: Order[];
  total: number;
}

/** 详情返回：联系方式仅在有权限时下发 */
export interface ClaimerCredit {
  creditScore: number;
  avgScore: number;
  ratingCount: number;
  acceptedCount: number;
  finishedCount: number;
  finishRate: number;
}

export interface DetailResult {
  order: Order;
  contact?: string;
  claimerContact?: string;
  claimerCredit?: ClaimerCredit;
  myReview?: Review;
}

export const api = {
  // ---------- 认证 ----------
  login: () => callFunction<UserProfile>('login'),

  // ---------- 订单 ----------
  publishOrder: (payload: PublishPayload) =>
    callFunction<Order>('orderService', { action: 'publish', payload }),

  listOrders: (query: OrderQuery) =>
    callFunction<ListResult>('orderService', { action: 'list', query }),

  myOrders: (role: 'poster' | 'claimer') =>
    callFunction<ListResult>('orderService', { action: 'my', role }),

  getOrderDetail: (id: string) =>
    callFunction<DetailResult>('orderService', { action: 'detail', id }),

  /** 接单：生成 5% 信息费支付单，微信端返回 JSAPI 支付参数 */
  claimOrder: (id: string) =>
    callFunction<ClaimResult>('orderService', { action: 'claim', id }),

  /** 接单人提交完成（凭证说明） */
  submitFinish: (id: string, proofNote: string) =>
    callFunction<Order>('orderService', { action: 'finish', id, proofNote }),

  /** 发单人确认完成 */
  confirmOrder: (id: string) =>
    callFunction<Order>('orderService', { action: 'confirm', id }),

  /** 取消订单（接单前发单人可取消；接单后双方协商取消） */
  cancelOrder: (id: string, reason: string) =>
    callFunction<Order>('orderService', { action: 'cancel', id, reason }),

  /** 举报 */
  reportOrder: (targetOpenid: string, reason: string, orderId?: string) =>
    callFunction<{ id: string }>('orderService', {
      action: 'report',
      targetOpenid,
      reason,
      orderId
    }),

  // ---------- 用户/信誉 ----------
  getProfile: (openid?: string) =>
    callFunction<UserProfile>('userService', { action: 'profile', openid }),

  updateProfile: (patch: Partial<UserProfile>) =>
    callFunction<UserProfile>('userService', { action: 'update', patch }),

  /** 学生认证：学号格式校验 */
  submitVerify: (school: string, studentNo: string) =>
    callFunction<UserProfile>('userService', { action: 'submitVerify', school, studentNo }),

  searchUsers: (params: { keyword?: string; sort: UserSort }) =>
    callFunction<{ list: UserProfile[] }>('userService', {
      action: 'search',
      keyword: params.keyword,
      sort: params.sort
    }),

  // ---------- 评价 ----------
  submitReview: (payload: {
    orderId: string;
    toOpenid: string;
    role: 'poster' | 'claimer';
    stars: number;
    tags: string[];
    content: string;
  }) => callFunction<Review>('reviewService', { action: 'submit', ...payload }),

  listReviews: (openid: string) =>
    callFunction<{ list: Review[] }>('reviewService', { action: 'list', openid })
};
