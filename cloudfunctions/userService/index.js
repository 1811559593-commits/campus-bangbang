const { pg, one, success, fail, qIdent, getOpenid } = require('./helper');

// 可排序字段 -> users.stats 内的 jsonb 键
const SORT_SQL = {
  score: { expr: `(stats->>'avgScore')::numeric`, dir: 'DESC' },
  accepted: { expr: `(stats->>'acceptedCount')::int`, dir: 'DESC' },
  finishRate: { expr: `(stats->>'finishRate')::int`, dir: 'DESC' },
  response: { expr: `(stats->>'avgResponseMin')::int`, dir: 'ASC' }
};

const ALLOW_UPDATE = ['nickName', 'avatar', 'phone', 'contact', 'school', 'campus', 'bio'];

// 各校学号格式规则（正则 + 提示）
const SCHOOL_RULES = {
  '传媒大学': { pattern: /^20\d{10}$/, hint: '学号为12位数字，如 202316153001' }
};

async function findByOpenid(openid) {
  return one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [openid]);
}

function desensitize(u) {
  delete u.phone;
  delete u.contact;
  delete u.studentNo;
  return u;
}

exports.main = async (event, context) => {
  const openid = getOpenid(event, context);
  try {
    switch (event.action) {
      case 'profile':
        return await profile(openid, event.openid);
      case 'update':
        return await update(openid, event.patch || {});
      case 'submitVerify':
        return await submitVerify(openid, event.school, event.studentNo);
      case 'search':
        return await search(event.keyword, event.sort);
      default:
        return fail('未知操作');
    }
  } catch (err) {
    console.error('[userService] error:', err);
    return fail(err.message || '服务异常');
  }
};

async function profile(selfOpenid, targetOpenid) {
  const openid = targetOpenid || selfOpenid;
  const user = await findByOpenid(openid);
  if (!user) return fail('用户不存在');
  // 他人主页不暴露手机号/微信号/学号
  if (openid !== selfOpenid) desensitize(user);
  return success(user);
}

async function update(openid, patch) {
  const me = await findByOpenid(openid);
  if (!me) return fail('用户不存在');

  const keys = ALLOW_UPDATE.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return success(me);

  const sets = keys.map((k, i) => `${qIdent(k)} = $${i + 1}`);
  const params = keys.map((k) => patch[k]);
  params.push(openid);
  const row = await one(
    `UPDATE users SET ${sets.join(', ')}, "updatedAt" = now()
     WHERE "_openid" = $${params.length} RETURNING *`,
    params
  );
  return success(row);
}

async function submitVerify(openid, school, studentNo) {
  const me = await findByOpenid(openid);
  if (!me) return fail('用户不存在');
  if (!school || !studentNo) return fail('学校和学号不能为空');

  const rule = SCHOOL_RULES[school];
  if (!rule) return fail('暂不支持该校认证，可选：示范大学、理工大学、师范大学');
  if (!rule.pattern.test(studentNo)) return fail('学号格式不正确，' + rule.hint);

  const row = await one(
    `UPDATE users SET "school" = $1, "studentNo" = $2, "verified" = true, "updatedAt" = now()
     WHERE "_openid" = $3 RETURNING *`,
    [school, studentNo, openid]
  );
  return success(row);
}

async function search(keyword, sort) {
  const conf = SORT_SQL[sort] || SORT_SQL.score;
  const where = ['verified = true'];
  const params = [];
  if (keyword && keyword.trim()) {
    params.push(`%${keyword.trim()}%`);
    where.push(`"nickName" ILIKE $1`);
  }
  const rows = await pg(
    `SELECT * FROM users WHERE ${where.join(' AND ')} ORDER BY ${conf.expr} ${conf.dir} LIMIT 50`,
    params
  );
  return success({ list: rows.map(desensitize) });
}
