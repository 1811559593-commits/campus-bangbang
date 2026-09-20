// ============================================
// 校园帮帮 - 全局类型定义
// ============================================

/** 订单状态机：待接单 -> 待发单人确认 -> 已接单 -> 待确认完成 -> 已完成（可评价）；取消/纠纷为终态分支 */
export type OrderStatus =
  | 'pending' // 待接单（大厅可见）
  | 'applied' // 接单人已免费申请，待发单人确认选择（仅发单人可见接单人联系方式）
  | 'claimed' // 发单人已确认，联系方式向接单人公开
  | 'submitted' // 接单人已提交完成，待发单人确认
  | 'completed' // 已完成，可评价
  | 'cancelled' // 已取消
  | 'disputed'; // 纠纷中

/** 代办订单类型 */
export type OrderType = 'express' | 'meal' | 'delivery' | 'seat' | 'errand' | 'other';

/** 订单 */
export interface Order {
  _id: string;
  posterOpenid: string;
  posterName: string;
  posterAvatar: string;
  type: OrderType;
  title: string;
  detail: string;
  school: string;
  campus?: string;
  location: string;
  classroom?: string;
  expectTime: string; // ISO 时间字符串
  price: number; // 发单人承诺的线下报酬（元）
  infoFeeRate: number; // 信息费率（模式验证期暂停收取，新单为 0）
  infoFee: number; // 信息费（模式验证期暂停收取，新单为 0）
  status: OrderStatus;
  topUntil?: string; // 加急卡置顶截止时间（期间大厅排序优先）
  claimerOpenid?: string;
  claimerName?: string;
  claimerContact?: string; // 接单人联系方式（申请时快照，申请后即对发单人可见）
  contact?: string; // 发单人联系方式（发单人确认选择后随详情返回）
  proofNote?: string; // 完成凭证说明
  createdAt: string;
  claimedAt?: string;
  submittedAt?: string;
  completedAt?: string;
}

/** 接单大厅列表查询参数 */
export interface OrderQuery {
  keyword?: string;
  type?: OrderType | 'all';
  sort?: 'latest' | 'priceDesc' | 'urgent';
  campus?: string;
}

/** 用户信誉统计（冗余字段，供排序） */
export interface UserStats {
  avgScore: number; // 平均评分 1-5
  ratingCount: number; // 被评价次数
  acceptedCount: number; // 累计接单量
  finishedCount: number; // 完成单量
  finishRate: number; // 完成率 0-100
  violateCount: number; // 违规次数
  avgResponseMin: number; // 平均响应时长（分钟）
}

/** 用户档案 */
export interface UserProfile {
  openid: string;
  nickName: string;
  avatar: string;
  phone?: string;
  contact?: string; // 微信号
  school: string;
  campus?: string;
  studentNo?: string;
  verified: boolean; // 是否通过学生认证
  creditScore: number; // 信誉分（初始 100）
  bio?: string;
  isAdmin?: boolean;
  stats: UserStats;
}

/** 找人排序 */
export type UserSort = 'score' | 'accepted' | 'finishRate' | 'response';

/** 学校学号格式规则 */
export interface SchoolRule {
  name: string;
  hint: string;
}

/** 评价 */
export interface Review {
  _id: string;
  orderId: string;
  fromOpenid: string;
  fromName: string;
  fromAvatar: string;
  toOpenid: string;
  stars: number;
  tags: string[];
  content: string;
  role: 'poster' | 'claimer'; // 评价人角色：发单人评价 / 接单人评价
  createdAt: string;
}

/** 支付流水（信息费） */
export interface Payment {
  _id: string;
  orderId: string;
  payerOpenid: string;
  amount: number;
  feeRate: number;
  status: 'pending' | 'paid' | 'refunded';
  wxTransactionId?: string;
  createdAt: string;
  paidAt?: string;
}

/** 举报 */
export interface Report {
  _id: string;
  orderId?: string;
  reporterOpenid: string;
  targetOpenid: string;
  reason: string;
  images?: string[];
  status: 'pending' | 'handled' | 'rejected';
  createdAt: string;
}
