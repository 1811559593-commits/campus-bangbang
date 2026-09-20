const { pg, one, success, fail, genId, getOpenid, checkTextContent } = require('./helper');

exports.main = async (event, context) => {
  const openid = getOpenid(event, context);
  try {
    if (event.action === 'list') {
      const rows = await pg(
        `SELECT * FROM reviews WHERE "toOpenid" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
        [event.openid]
      );
      return success({ list: rows });
    }
    if (event.action === 'submit') {
      return await submit(openid, event);
    }
    return fail('未知操作');
  } catch (err) {
    console.error('[reviewService] error:', err);
    return fail(err.message || '服务异常');
  }
};

async function submit(openid, event) {
  const stars = Number(event.stars);
  if (!(stars >= 1 && stars <= 5)) return fail('请选择评分');

  const order = await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [event.orderId]);
  if (!order) return fail('订单不存在');
  if (order.status !== 'completed') return fail('只有已完成的订单可以评价');

  // 同一订单每人仅可评价一次（唯一索引兜底）
  const dup = await one(
    'SELECT "_id" FROM reviews WHERE "orderId" = $1 AND "fromOpenid" = $2 LIMIT 1',
    [event.orderId, openid]
  );
  if (dup) return fail('您已评价过该订单');

  // 评价对象必须是订单对方
  const expectedTo = event.role === 'poster' ? order.claimerOpenid : order.posterOpenid;
  if (!expectedTo || expectedTo !== event.toOpenid) return fail('评价对象不合法');

  // 内容安全检测
  const contentOk = await checkTextContent(event.content || '');
  if (!contentOk) return fail('评价内容包含违规信息，请修改');

  const me = await one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [openid]);
  const tags = Array.isArray(event.tags) ? JSON.stringify(event.tags.slice(0, 4)) : '[]';

  const row = await one(
    `INSERT INTO reviews (
      "_id", "orderId", "fromOpenid", "fromName", "fromAvatar",
      "toOpenid", stars, tags, content, role
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`,
    [
      genId('rv_'),
      event.orderId,
      openid,
      me ? me.nickName : '校园用户',
      me ? me.avatar : '',
      event.toOpenid,
      stars,
      tags,
      (event.content || '').trim(),
      event.role
    ]
  );

  await recalcStats(event.toOpenid);
  console.info('[reviewService] review submitted:', row._id);
  return success(row);
}

async function recalcStats(toOpenid) {
  const [user, agg] = await Promise.all([
    one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [toOpenid]),
    one(
      `SELECT COALESCE(ROUND(AVG(stars), 1), 0) AS avg, COUNT(*)::int AS count
       FROM reviews WHERE "toOpenid" = $1`,
      [toOpenid]
    )
  ]);
  if (!user) return;

  const accepted = (user.stats && Number(user.stats.acceptedCount)) || 0;
  const finished = (user.stats && Number(user.stats.finishedCount)) || 0;
  const ratingCount = agg ? Number(agg.count) : 0;
  const avgScore = agg ? Number(agg.avg) : 0;
  const finishRate = accepted > 0 ? Math.round((finished / accepted) * 100) : 0;

  await pg(
    `UPDATE users SET stats =
        jsonb_set(
          jsonb_set(
            jsonb_set(COALESCE(stats, '{}'::jsonb),
              '{avgScore}', $2::numeric::text::jsonb, true),
            '{ratingCount}', $3::int::text::jsonb, true),
          '{finishRate}', $4::int::text::jsonb, true),
      "updatedAt" = now()
     WHERE "_openid" = $1`,
    [toOpenid, avgScore, ratingCount, finishRate]
  );
}
