// ============================================
// 演示模式：云环境未连接/未部署时，真机也走本地模拟数据
// 云函数部署成功后，cloud.ts 会自动优先走真实云调用，此模块不再被触发
// ============================================
import loginMock from '@/data/login';
import orderServiceMock from '@/data/orderService';
import userServiceMock from '@/data/userService';
import reviewServiceMock from '@/data/reviewService';

type MockHandler = (data?: Record<string, any>) => Promise<any>;

const handlers: Record<string, MockHandler> = {
  login: () => loginMock(),
  orderService: (data) => orderServiceMock(data as any),
  userService: (data) => userServiceMock(data as any),
  reviewService: (data) => reviewServiceMock(data as any)
};

/** 是否已进入演示模式（由 cloud.ts 在云调用首次失败时置位） */
let demoModeActivated = false;

export function isDemoMode(): boolean {
  return demoModeActivated;
}

export function activateDemoMode(): void {
  demoModeActivated = true;
}

export async function callDemo(name: string, data?: Record<string, any>): Promise<any> {
  const handler = handlers[name];
  if (!handler) {
    console.error(`[Demo] 暂不支持的云函数：${name}`);
    throw new Error('演示模式暂不支持该操作');
  }
  return handler(data);
}
