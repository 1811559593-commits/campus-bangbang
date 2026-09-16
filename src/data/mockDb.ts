// ============================================
// H5 预览用内存 Mock 数据库（微信端走真实云函数）
// 字段结构与云函数返回保持一致
// ============================================
import dayjs from 'dayjs';
import type { Order, OrderStatus, Review, UserProfile } from '@/types';
import { calcInfoFee } from '@/utils/format';

export const SELF_OPENID = 'u_self';

let seq = 1000;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export function now(): string {
  return new Date().toISOString();
}

export const users: UserProfile[] = [
  {
    openid: SELF_OPENID,
    nickName: '林同学',
    avatar: 'https://picsum.photos/id/177/200/200',
    phone: '138****2048',
    contact: 'wx_lintongxue',
    school: '示范大学',
    campus: '东区',
    studentNo: '2023****21',
    verified: true,
    creditScore: 100,
    bio: '诚信互助，校园你我他',
    isAdmin: true,
    stats: {
      avgScore: 4.8,
      ratingCount: 12,
      acceptedCount: 15,
      finishedCount: 15,
      finishRate: 100,
      violateCount: 0,
      avgResponseMin: 6
    }
  },
  {
    openid: 'u_chen',
    nickName: '陈小帮',
    avatar: 'https://picsum.photos/id/91/200/200',
    school: '示范大学',
    campus: '东区',
    verified: true,
    creditScore: 98,
    bio: '快递小达人，午晚都在驿站附近',
    stats: {
      avgScore: 4.9,
      ratingCount: 102,
      acceptedCount: 128,
      finishedCount: 127,
      finishRate: 99,
      violateCount: 0,
      avgResponseMin: 3
    }
  },
  {
    openid: 'u_wang',
    nickName: '王跑腿',
    avatar: 'https://picsum.photos/id/64/200/200',
    school: '示范大学',
    campus: '西区',
    verified: true,
    creditScore: 95,
    bio: '有电动车，全校可跑',
    stats: {
      avgScore: 4.8,
      ratingCount: 70,
      acceptedCount: 86,
      finishedCount: 84,
      finishRate: 98,
      violateCount: 1,
      avgResponseMin: 5
    }
  },
  {
    openid: 'u_li',
    nickName: '李快递',
    avatar: 'https://picsum.photos/id/338/200/200',
    school: '示范大学',
    campus: '南区',
    verified: true,
    creditScore: 90,
    stats: {
      avgScore: 4.7,
      ratingCount: 51,
      acceptedCount: 64,
      finishedCount: 60,
      finishRate: 94,
      violateCount: 1,
      avgResponseMin: 8
    }
  },
  {
    openid: 'u_zhao',
    nickName: '赵饭饭',
    avatar: 'https://picsum.photos/id/1027/200/200',
    school: '示范大学',
    campus: '东区',
    verified: true,
    creditScore: 92,
    bio: '三餐时段在线，代买不洒不漏',
    stats: {
      avgScore: 4.6,
      ratingCount: 38,
      acceptedCount: 45,
      finishedCount: 43,
      finishRate: 96,
      violateCount: 0,
      avgResponseMin: 7
    }
  },
  {
    openid: 'u_zhou',
    nickName: '周快速',
    avatar: 'https://picsum.photos/id/1025/200/200',
    school: '示范大学',
    campus: '北区',
    verified: true,
    creditScore: 96,
    bio: '响应快，完成快',
    stats: {
      avgScore: 4.9,
      ratingCount: 26,
      acceptedCount: 32,
      finishedCount: 31,
      finishRate: 97,
      violateCount: 0,
      avgResponseMin: 2
    }
  },
  {
    openid: 'u_wu',
    nickName: '吴靠谱',
    avatar: 'https://picsum.photos/id/342/200/200',
    school: '示范大学',
    campus: '西区',
    verified: true,
    creditScore: 88,
    stats: {
      avgScore: 4.5,
      ratingCount: 18,
      acceptedCount: 21,
      finishedCount: 19,
      finishRate: 90,
      violateCount: 2,
      avgResponseMin: 12
    }
  },
  {
    openid: 'u_zheng',
    nickName: '郑萌新',
    avatar: 'https://picsum.photos/id/1012/200/200',
    school: '示范大学',
    campus: '东区',
    verified: false,
    creditScore: 100,
    bio: '刚注册，想赚点奶茶钱',
    stats: {
      avgScore: 5,
      ratingCount: 3,
      acceptedCount: 3,
      finishedCount: 3,
      finishRate: 100,
      violateCount: 0,
      avgResponseMin: 15
    }
  }
];

function buildOrder(partial: Partial<Order> & Pick<Order, 'posterOpenid' | 'type' | 'title' | 'location' | 'price' | 'expectTime' | 'createdAt' | 'status'>): Order {
  const poster = users.find((u) => u.openid === partial.posterOpenid) || users[0];
  const price = partial.price;
  return {
    _id: nextId('ord'),
    posterOpenid: poster.openid,
    posterName: poster.nickName,
    posterAvatar: poster.avatar,
    detail: '',
    school: '示范大学',
    campus: '东区',
    classroom: '',
    infoFeeRate: 0.05,
    infoFee: calcInfoFee(price),
    contact: `微信 ${poster.openid === SELF_OPENID ? 'wx_lintongxue' : poster.openid}_wx / 手机号 138****${1000 + seq}`,
    ...partial
  };
}

const iso = (minusMin: number) => dayjs().subtract(minusMin, 'minute').toISOString();
const future = (plusMin: number) => dayjs().add(plusMin, 'minute').toISOString();

export const orders: Order[] = [
  // ---- 我发布的（各种状态，覆盖订单状态机） ----
  buildOrder({
    posterOpenid: SELF_OPENID,
    type: 'express',
    title: '东门顺丰驿站代取一个快递（小件）',
    detail: '取件码 8-2031，盒子不大，送到东区 3 号宿舍楼即可',
    campus: '东区',
    location: '东区3号宿舍楼',
    price: 5,
    expectTime: future(120),
    createdAt: iso(15),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: SELF_OPENID,
    type: 'meal',
    title: '二食堂代带一份黄焖鸡米饭',
    detail: '微辣，不要香菜，饭多一点，送到教三 203',
    campus: '东区',
    location: '第三教学楼',
    classroom: '203',
    price: 6,
    expectTime: future(45),
    createdAt: iso(40),
    status: 'claimed',
    claimerOpenid: 'u_chen',
    claimerName: '陈小帮',
    claimedAt: iso(30)
  }),
  buildOrder({
    posterOpenid: SELF_OPENID,
    type: 'delivery',
    title: '图书馆归还两本书到借阅台',
    detail: '书在宿舍门卫处，帮忙放进图书馆还书口',
    campus: '东区',
    location: '校图书馆',
    price: 4,
    expectTime: iso(20),
    createdAt: iso(180),
    status: 'submitted',
    claimerOpenid: 'u_wang',
    claimerName: '王跑腿',
    claimedAt: iso(150),
    submittedAt: iso(25),
    proofNote: '已放入图书馆一楼还书口，拍了照片'
  }),
  buildOrder({
    posterOpenid: SELF_OPENID,
    type: 'seat',
    title: '明早教三 305 靠窗位置占座',
    detail: '8 点前放一本书即可，到了联系我拿书',
    campus: '东区',
    location: '第三教学楼',
    classroom: '305',
    price: 3,
    expectTime: future(60 * 18),
    createdAt: iso(60 * 20),
    status: 'cancelled'
  }),
  // ---- 我接单的 ----
  buildOrder({
    posterOpenid: 'u_zhao',
    type: 'meal',
    title: '一食堂代带一杯豆浆两个包子',
    detail: '到了放西区 6 舍楼下架子上，微信说一声',
    campus: '西区',
    location: '西区6号宿舍楼',
    price: 4,
    expectTime: future(90),
    createdAt: iso(10),
    status: 'claimed',
    claimerOpenid: SELF_OPENID,
    claimerName: '林同学',
    claimedAt: iso(6)
  }),
  buildOrder({
    posterOpenid: 'u_zhou',
    type: 'errand',
    title: '校医院代取化验单送到北区宿舍',
    detail: '报手机号尾号 2048 即可取，辛苦',
    campus: '北区',
    location: '北区2号宿舍楼',
    price: 8,
    expectTime: iso(40),
    createdAt: iso(200),
    status: 'completed',
    claimerOpenid: SELF_OPENID,
    claimerName: '林同学',
    claimedAt: iso(190),
    submittedAt: iso(60),
    completedAt: iso(50)
  }),
  // ---- 大厅公开订单 ----
  buildOrder({
    posterOpenid: 'u_li',
    type: 'express',
    title: '菜鸟驿站代取快递 2 件送到南区宿舍',
    detail: '都是衣物包裹，不重，取件码私信发你',
    campus: '南区',
    location: '南区9号宿舍楼',
    price: 7,
    expectTime: future(70),
    createdAt: iso(8),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_wu',
    type: 'errand',
    title: '校门口代拿一份外卖到西区',
    detail: '外卖柜 B12，趁热，可加钱',
    campus: '西区',
    location: '西区教学楼B座',
    classroom: '410',
    price: 10,
    expectTime: future(35),
    createdAt: iso(5),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_zheng',
    type: 'delivery',
    title: '代送一份资料到行政楼 302',
    detail: 'A4 文件袋，从东区宿舍门卫处取',
    campus: '东区',
    location: '行政楼',
    classroom: '302',
    price: 6,
    expectTime: future(150),
    createdAt: iso(25),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_chen',
    type: 'meal',
    title: '三食堂代带酸辣粉一份到北区',
    detail: '加一份丸子，汤分开装',
    campus: '北区',
    location: '北区1号宿舍楼',
    price: 9,
    expectTime: future(50),
    createdAt: iso(3),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_wang',
    type: 'seat',
    title: '图书馆三楼自习室占座（靠窗）',
    detail: '需要安静一点的位置，7:50 前放好资料',
    campus: '东区',
    location: '校图书馆',
    classroom: '三楼自习室',
    price: 5,
    expectTime: future(60 * 14),
    createdAt: iso(60 * 2),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_zhou',
    type: 'express',
    title: '京东快递代取（较大纸箱）',
    detail: '一箱牛奶，介意勿接，送到北区即可',
    campus: '北区',
    location: '北区4号宿舍楼',
    price: 12,
    expectTime: future(180),
    createdAt: iso(35),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_zhao',
    type: 'other',
    title: '代打印 20 页论文并装订',
    detail: '文件发你邮箱，黑白双面，胶装一本',
    campus: '东区',
    location: '东区3号宿舍楼',
    price: 8,
    expectTime: future(240),
    createdAt: iso(60),
    status: 'pending'
  }),
  buildOrder({
    posterOpenid: 'u_li',
    type: 'meal',
    title: '清真食堂代带牛肉面（不要香菜）',
    detail: '送到南区操场看台，我在踢球',
    campus: '南区',
    location: '南区操场',
    price: 6,
    expectTime: future(65),
    createdAt: iso(12),
    status: 'pending'
  })
];

export const reviews: Review[] = [
  {
    _id: nextId('rev'),
    orderId: 'ord_demo_1',
    fromOpenid: 'u_chen',
    fromName: '陈小帮',
    fromAvatar: 'https://picsum.photos/id/91/200/200',
    toOpenid: SELF_OPENID,
    stars: 5,
    tags: ['描述属实', '付款爽快'],
    content: '同学很好沟通，报酬秒结，推荐！',
    role: 'claimer',
    createdAt: iso(60 * 24 * 2)
  },
  {
    _id: nextId('rev'),
    orderId: 'ord_demo_2',
    fromOpenid: SELF_OPENID,
    fromName: '林同学',
    fromAvatar: 'https://picsum.photos/id/177/200/200',
    toOpenid: 'u_zhou',
    stars: 5,
    tags: ['速度快', '沟通顺畅'],
    content: '半小时就送到了，很靠谱。',
    role: 'poster',
    createdAt: iso(60 * 50)
  },
  {
    _id: nextId('rev'),
    fromOpenid: SELF_OPENID,
    fromName: '林同学',
    fromAvatar: 'https://picsum.photos/id/177/200/200',
    orderId: 'ord_demo_3',
    toOpenid: 'u_chen',
    stars: 5,
    tags: ['准时', '认真负责'],
    content: '饭带得很完整，汤也没洒。',
    role: 'poster',
    createdAt: iso(60 * 70)
  }
];

/** 依据评价重算用户信誉统计（mock 简化版） */
export function refreshStats(openid: string): void {
  const user = users.find((u) => u.openid === openid);
  if (!user) return;
  const list = reviews.filter((r) => r.toOpenid === openid);
  if (list.length > 0) {
    user.stats.avgScore =
      Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10;
    user.stats.ratingCount = list.length;
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function setStatus(order: Order, status: OrderStatus, patch: Partial<Order> = {}): Order {
  order.status = status;
  Object.assign(order, patch);
  return order;
}
