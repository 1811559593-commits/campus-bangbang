const { one, genId, getOpenid } = require('./helper');

exports.main = async (event, context) => {
  const openid = getOpenid(event, context);
  try {
    console.info('[login] resolved openid:', openid || '(empty)');
    if (!openid) {
      return {
        code: -1,
        message: '未能获取微信身份，请从真机小程序中重新进入',
        data: null
      };
    }

    const existing = await one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [openid]);
    if (existing) {
      return { code: 0, message: 'success', data: existing };
    }

    // 首次登录建档：信誉分初始 100，其余字段走数据库默认值
    const row = await one(
      'INSERT INTO users ("_id", "_openid", "openid") VALUES ($1, $2, $3) RETURNING *',
      [genId('u_'), openid, openid]
    );
    console.info('[login] new user created:', openid);
    return { code: 0, message: 'success', data: row };
  } catch (err) {
    console.error('[login] error:', err);
    // 并发冷启动可能重复建档，唯一索引兜底：再查一次
    if (err.pgCode === 'DATABASE_23505' && openid) {
      const row = await one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [openid]).catch(
        () => null
      );
      if (row) return { code: 0, message: 'success', data: row };
    }
    return { code: -1, message: err.message || '登录失败', data: null };
  }
};
