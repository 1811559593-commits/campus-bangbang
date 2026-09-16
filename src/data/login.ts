import { SELF_OPENID, users } from './mockDb';
import type { UserProfile } from '@/types';

/** 登录：微信端由云函数基于 openid 免鉴权返回；H5 预览返回固定模拟用户 */
export default async function login(): Promise<UserProfile> {
  const user = users.find((u) => u.openid === SELF_OPENID);
  if (!user) throw new Error('用户不存在');
  return user;
}
