import { SELF_OPENID, assert, users } from './mockDb';
import type { UserProfile, UserSort } from '@/types';

type UserEvent =
  | { action: 'profile'; openid?: string }
  | { action: 'update'; patch: Partial<UserProfile> }
  | { action: 'submitVerify'; school: string; studentNo: string }
  | { action: 'search'; keyword?: string; sort: UserSort };

export default async function userService(event: UserEvent): Promise<unknown> {
  switch (event.action) {
    case 'profile':
      return profile(event.openid);
    case 'update':
      return update(event.patch);
    case 'submitVerify':
      return submitVerify(event.school, event.studentNo);
    case 'search':
      return search(event.keyword, event.sort);
    default:
      throw new Error('未知操作');
  }
}

function profile(openid?: string): UserProfile {
  const target = openid || SELF_OPENID;
  const user = users.find((u) => u.openid === target);
  assert(!!user, '用户不存在');
  return user!;
}

function update(patch: Partial<UserProfile>): UserProfile {
  const me = users.find((u) => u.openid === SELF_OPENID)!;
  Object.assign(me, patch);
  return me;
}

// 各校学号格式（与云函数 SCHOOL_RULES 保持一致）
const MOCK_SCHOOL_RULES: Record<string, { pattern: RegExp; hint: string }> = {
  '传媒大学': { pattern: /^20\d{10}$/, hint: '学号为12位数字，如 202316153001' }
};

function submitVerify(school: string, studentNo: string): UserProfile {
  const me = users.find((u) => u.openid === SELF_OPENID)!;
  assert(!!school && !!studentNo, '学校和学号不能为空');
  const rule = MOCK_SCHOOL_RULES[school];
  assert(!!rule, '暂不支持该校认证');
  assert(rule.pattern.test(studentNo), '学号格式不正确，' + rule.hint);
  me.school = school;
  me.studentNo = studentNo;
  me.verified = true;
  return me;
}

function search(keyword: string | undefined, sort: UserSort): { list: UserProfile[] } {
  let list = users.filter((u) => u.openid !== SELF_OPENID);
  const kw = keyword?.trim();
  if (kw) {
    list = list.filter((u) => u.nickName.includes(kw) || (u.bio || '').includes(kw));
  }
  const sorted = [...list];
  switch (sort) {
    case 'accepted':
      sorted.sort((a, b) => b.stats.acceptedCount - a.stats.acceptedCount);
      break;
    case 'finishRate':
      sorted.sort((a, b) => b.stats.finishRate - a.stats.finishRate);
      break;
    case 'response':
      sorted.sort((a, b) => a.stats.avgResponseMin - b.stats.avgResponseMin);
      break;
    case 'score':
    default:
      sorted.sort(
        (a, b) =>
          b.stats.avgScore - a.stats.avgScore || b.stats.ratingCount - a.stats.ratingCount
      );
  }
  return { list: sorted };
}
