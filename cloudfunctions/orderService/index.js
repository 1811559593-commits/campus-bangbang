const {
  pg,
  one,
  success,
  fail,
  calcInfoFee,
  genId,
  mapOrder,
  mapOrders,
  getOpenid,
  INFO_FEE_RATE
} = require('./helper');

async function getUser(openid) {
  return one('SELECT * FROM users WHERE "_openid" = $1 LIMIT 1', [openid]);
}

exports.main = async (event, context) => {
  const openid = getOpenid(event, context);
  try {
    switch (event.action) {
      case 'list':
        return await listOrders(event.query || {});
      case 'my':
        return await myOrders(openid, event.role);
      case 'detail':
        return await detail(openid, event.id);
      case 'publish':
        return await publish(openid, event.payload);
      case 'claim':
        return await claim(openid, event.id);
      case 'finish':
        return await finish(openid, event.id, event.proofNote);
      case 'confirm':
        return await confirm(openid, event.id);
      case 'cancel':
        return await cancel(openid, event.id, event.reason);
      case 'report':
        return await report(openid, event.targetOpenid, event.reason, event.orderId);
      default:
        return fail('未知操作');
    }
  } catch (err) {
    console.error('[orderService] error:', err);
    return fail(err.message || '服务异常');
  }
};

async function listOrders(query) {
  const where = ["status = 'pending'"];
  const params = [];
  if (query.type && query.type !== 'all') {
    params.push(query.type);
    where.push(`type = $${params.length}`);
  }
  if (query.campus) {
    params.push(query.campus);
    where.push(`campus = $${params.length}`);
  }
  if (query.keyword && query.keyword.trim()) {
    params.push(`%${query.keyword.trim()}%`);
    const i = params.length;
    where.push(`(title ILIKE $${i} OR detail ILIKE $${i} OR location ILIKE $${i})`);
  }

  let orderBy = '"createdAt" DESC';
  if (query.sort === 'priceDesc') orderBy = 'price DESC';
  else if (query.sort === 'urgent') orderBy = '"expectTime" ASC';

  const rows = await pg(
    `SELECT * FROM orders WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT 50`,
    params
  );
  const list = mapOrders(rows);
  return success({ list, total: list.length });
}

async function myOrders(openid, role) {
  const column = role === 'poster' ? 'posterOpenid' : 'claimerOpenid';
  const rows = await pg(
    `SELECT * FROM orders WHERE "${column}" = $1 ORDER BY "createdAt" DESC LIMIT 100`,
    [openid]
  );
  const list = mapOrders(rows);
  return success({ list, total: list.length });
}

async function detail(openid, id) {
  const order = mapOrder(await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id]));
  if (!order) return fail('订单不存在或已被删除');

  const isPoster = order.posterOpenid === openid;
  const isClaimer = order.claimerOpenid === openid;
  const canSeeContact = isPoster || (isClaimer && order.status !== 'pending');

  const myReview = await one(
    'SELECT * FROM reviews WHERE "orderId" = $1 AND "fromOpenid" = $2 LIMIT 1',
    [id, openid]
  );

  // 发单人查看已接单订单时，返回接单人联系方式 + 信用概况
  let claimerContact;
  let claimerCredit;
  if (isPoster && order.claimerOpenid && order.status !== 'pending' && order.status !== 'cancelled') {
    claimerContact = order.claimerContact || undefined;
    const claimer = await one(
      'SELECT "creditScore", stats FROM users WHERE "_openid" = $1 LIMIT 1',
      [order.claimerOpenid]
    );
    if (claimer) {
      const s = claimer.stats || {};
      claimerCredit = {
        creditScore: Number(claimer.creditScore),
        avgScore: Number(s.avgScore) || 0,
        ratingCount: Number(s.ratingCount) || 0,
        acceptedCount: Number(s.acceptedCount) || 0,
        finishedCount: Number(s.finishedCount) || 0,
        finishRate: Number(s.finishRate) || 0
      };
    }
  }

  return success({ order, contact: canSeeContact ? order.contact : undefined, claimerContact, claimerCredit, myReview });
}

async function publish(openid, p) {
  const me = await getUser(openid);
  if (!me) return fail('用户信息不存在，请重新登录');
  if (!p || !p.title || !p.title.trim()) return fail('请填写订单标题');
  if (!(Number(p.price) > 0)) return fail('报酬金额需大于 0');
  if (!p.expectTime) return fail('请选择期望完成时间');
  if (!p.contact || !p.contact.trim()) return fail('请填写联系方式');

  const price = Number(p.price);
  const row = mapOrder(
    await one(
      `INSERT INTO orders (
        "_id", "posterOpenid", "posterName", "posterAvatar",
        type, title, detail, school, campus, location, classroom,
        "expectTime", price, "infoFeeRate", "infoFee", status, contact
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending',$16)
       RETURNING *`,
      [
        genId('o_'),
        openid,
        me.nickName,
        me.avatar,
        p.type,
        p.title.trim(),
        (p.detail || '').trim(),
        p.school || me.school || '',
        p.campus || me.campus || '',
        (p.location || '').trim(),
        (p.classroom || '').trim(),
        p.expectTime,
        price,
        INFO_FEE_RATE,
        calcInfoFee(price),
        p.contact.trim()
      ]
    )
  );
  console.info('[orderService] publish order:', row._id);
  return success(row);
}

async function claim(openid, id) {
  const me = await getUser(openid);
  if (!me) return fail('用户信息不存在');
  if (Number(me.creditScore) < 80) return fail('信誉分过低（低于80），暂时无法接单');
  // 接单人必须提供联系方式，接单时同步给发单人
  const claimerContact = (me.contact || '').trim() || (me.phone || '').trim();
  if (!claimerContact) return fail('请先在个人中心填写联系方式后再接单');

  const order = mapOrder(await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id]));
  if (!order) return fail('订单不存在');
  if (order.posterOpenid === openid) return fail('不能接自己发布的订单');
  if (order.status !== 'pending') return fail('手慢了，订单已被接单');

  const pending = await one(
    `SELECT "_id" FROM payments WHERE "orderId" = $1 AND status = 'pending' LIMIT 1`,
    [id]
  );
  if (pending) return fail('您已有一笔待支付的信息费，请完成支付');

  const outTradeNo = `IF${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const totalFee = Math.round(order.infoFee * 100); // 单位：分

  await one(
    `INSERT INTO payments (
      "_id", "outTradeNo", "orderId", "payerOpenid", amount, "totalFee", "feeRate", status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
    [genId('p_'), outTradeNo, id, openid, order.infoFee, totalFee, INFO_FEE_RATE]
  );

  // 商户微信支付尚未通过 CloudBase 集成中心配置：
  // 内测期由环境变量 ENABLE_DEMO_PAY=1 直接结算信息费（生产接入支付后关闭该开关，
  // 改为调用集成中心支付函数统一下单，支付成功经 settle_info_fee 落账）。
  if (process.env.ENABLE_DEMO_PAY === '1') {
    const settled = await one('SELECT public.settle_info_fee($1, $2) AS result', [
      outTradeNo,
      'DEMO'
    ]);
    console.info('[orderService] demo settle:', outTradeNo, settled && settled.result);
    // 快照接单人联系方式到订单，供发单人查看
    await one(
      `UPDATE orders SET "claimerContact" = $2 WHERE "_id" = $1 AND "claimerContact" = ''`,
      [id, claimerContact]
    );
    const updated = mapOrder(
      await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id])
    );
    return success({ claimed: true, paid: true, payParams: null, order: updated });
  }

  console.warn('[orderService] wechat pay not configured, claim blocked:', outTradeNo);
  return fail('微信支付通道开通中，暂无法接单，请稍后再试');
}

async function finish(openid, id, proofNote) {
  const order = mapOrder(await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id]));
  if (!order) return fail('订单不存在');
  if (order.claimerOpenid !== openid) return fail('只有接单人可以提交完成');
  if (order.status !== 'claimed') return fail('当前状态不能提交完成');

  const row = mapOrder(
    await one(
      `UPDATE orders SET status = 'submitted', "submittedAt" = now(), "proofNote" = $2
       WHERE "_id" = $1 RETURNING *`,
      [id, proofNote || '']
    )
  );
  return success(row);
}

async function confirm(openid, id) {
  const order = mapOrder(await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id]));
  if (!order) return fail('订单不存在');
  if (order.posterOpenid !== openid) return fail('只有发单人可以确认');
  if (order.status !== 'submitted') return fail('接单人尚未提交完成');

  const row = mapOrder(
    await one(
      `UPDATE orders SET status = 'completed', "completedAt" = now() WHERE "_id" = $1 RETURNING *`,
      [id]
    )
  );

  if (order.claimerOpenid) {
    await pg(
      `UPDATE users SET stats = jsonb_set(
          COALESCE(stats, '{}'::jsonb),
          '{finishedCount}',
          (COALESCE((stats->>'finishedCount')::int, 0) + 1)::text::jsonb,
          true
        ), "updatedAt" = now()
       WHERE "_openid" = $1`,
      [order.claimerOpenid]
    ).catch((err) => console.error('[orderService] stats update failed:', err));
  }
  return success(row);
}

async function cancel(openid, id, reason) {
  const order = mapOrder(await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [id]));
  if (!order) return fail('订单不存在');
  if (order.posterOpenid !== openid && order.claimerOpenid !== openid) {
    return fail('只有订单双方可以取消');
  }
  if (!['pending', 'claimed'].includes(order.status)) return fail('当前状态无法取消');
  if (order.status === 'claimed' && !(reason && reason.trim())) {
    return fail('接单后取消需填写原因，信息费是否退还以管理员判责为准');
  }
  const row = mapOrder(
    await one(
      `UPDATE orders SET status = 'cancelled' WHERE "_id" = $1 RETURNING *`,
      [id]
    )
  );
  return success(row);
}

async function report(openid, targetOpenid, reason, orderId) {
  if (!reason || !reason.trim()) return fail('请填写举报原因');
  const row = await one(
    `INSERT INTO reports ("_id", "orderId", "reporterOpenid", "targetOpenid", reason, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [genId('rp_'), orderId || '', openid, targetOpenid, reason.trim()]
  );
  console.info('[orderService] report created:', row._id);
  return success({ id: row._id });
}
