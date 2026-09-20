import { callFunction } from './cloud';
import type {
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

/** 加急卡购买结果（正式虚拟支付开通后 payParams 下发 wx.requestVirtualPayment 参数） */
export interface UrgentCardResult {
  paid: boolean;
  payParams?: Record<string, any> | null;
  amount: number;
  topUntil: string;
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

  /** 免费申请接单：订单进入待发单人确认（applied），不产生支付 */
  claimOrder: (id: string) =>
    callFunction<Order>('orderService', { action: 'claim', id }),

  /** 发单人确认选择接单人：applied -> claimed，此后向接单人公开联系方式 */
  confirmClaimOrder: (id: string) =>
    callFunction<Order>('orderService', { action: 'confirmClaim', id }),

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
    callFunction<{ list: Review[] }>('reviewService', { action: 'list', openid }),

  // ---------- 虚拟道具 ----------
  /** 购买加急卡：订单大厅置顶 24 小时（个人虚拟支付；内测期 demo 直接到账） */
  buyUrgentCard: (orderId: string) =>
    callFunction<UrgentCardResult>('propService', { action: 'buyTop', orderId })
};
