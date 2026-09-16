import Taro from '@tarojs/taro';
import { activateDemoMode, callDemo, isDemoMode } from './demo';

const isWeapp = process.env.TARO_ENV === 'weapp';

let demoNoticeShown = false;

/** 提示一次演示模式，避免每次调用都弹 toast */
function notifyDemoMode(err: unknown): void {
  console.warn('[Cloud] 云环境不可用，已降级演示模式:', err);
  if (!demoNoticeShown) {
    demoNoticeShown = true;
    Taro.showToast({
      title: '云环境未部署，当前为演示模式',
      icon: 'none',
      duration: 2500
    });
  }
}

export async function callFunction<T = any>(
  name: string,
  data?: Record<string, any>
): Promise<T> {
  // H5 / 其他平台：始终使用 mock
  if (!isWeapp) {
    const mockModule = await import(`../data/${name}`);
    return mockModule.default(data) as T;
  }

  // 微信端：已确认云环境不可用后直接走演示数据
  if (isDemoMode()) {
    return callDemo(name, data) as Promise<T>;
  }

  // 微信端：优先真实云函数
  // 注意：只有 callFunction 本身调用失败（网络/未部署/实例回收）才降级演示模式；
  // 云函数正常返回但 code≠0 属于业务错误（如「信誉分过低」），必须直接抛给前端
  let res;
  try {
    // 加 8 秒超时：instance_not_found 等错误可能导致 Promise 挂起
    res = await Promise.race([
      Taro.cloud.callFunction({ name, data }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('cloud_call_timeout')), 8000)
      )
    ]);
  } catch (infraErr) {
    activateDemoMode();
    notifyDemoMode(infraErr);
    return callDemo(name, data) as Promise<T>;
  }
  const result = res.result as any;
  // 非标准响应（如 instance_not_found 等基础设施错误）→ 降级演示模式
  if (!result || typeof result.code !== 'number') {
    activateDemoMode();
    notifyDemoMode(result);
    return callDemo(name, data) as Promise<T>;
  }
  // 业务错误（code≠0）→ 直接抛给前端，不降级
  if (result.code !== 0) {
    throw new Error(result.message || '请求失败');
  }
  return result.data as T;
}

export function getDatabase() {
  if (!isWeapp) {
    return null;
  }
  return Taro.cloud.database();
}
