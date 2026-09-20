const { one, success, fail, genId, getOpenid } = require('./helper');

// 加急卡档位（模式验证期固定一档；正式期可迁到虚拟支付后台配置）
const URGENT_CARD_PRICE = 1; // 元
const TOP_HOURS = 24; // 置顶时长

exports.main = async (event, context) => {
  const openid = getOpenid(event, context);
  try {
    switch (event.action) {
      case 'buyTop':
        return await buyTop(openid, event.orderId);
      default:
        return fail('未知操作');
    }
  } catch (err) {
    console.error('[propService] error:', err);
    return fail(err.message || '服务异常');
  }
};

/**
 * 购买加急卡并为指定订单置顶。
 * 内测期环境变量 ENABLE_DEMO_PAY=1：免支付直接到账（与信息费内测同一开关）。
 * 正式期（个人主体完成 ICP 备案、开通个人虚拟支付后）：
 *   1. 返回 wx.requestVirtualPayment 所需签名参数（offerId 等经环境变量注入）；
 *   2. 支付成功由微信「虚拟支付发货通知」回调把 prop_orders 置 paid 并写 orders.topUntil。
 */
async function buyTop(openid, orderId) {
  if (!orderId) return fail('缺少订单');

  const order = await one('SELECT * FROM orders WHERE "_id" = $1 LIMIT 1', [orderId]);
  if (!order) return fail('订单不存在');
  if (order.posterOpenid !== openid) return fail('只有发单人可以加急置顶');
  if (!['pending', 'applied'].includes(order.status)) {
    return fail('订单当前状态不能加急');
  }
  if (order.topUntil && new Date(order.topUntil).getTime() > Date.now()) {
    return fail('该订单已在加急置顶中');
  }

  const id = genId('pp_');
  await one(
    `INSERT INTO prop_orders ("_id", "buyerOpenid", "propType", "orderId", amount, status)
     VALUES ($1, $2, 'urgentCard', $3, $4, 'pending')`,
    [id, openid, orderId, URGENT_CARD_PRICE]
  );

  if (process.env.ENABLE_DEMO_PAY === '1') {
    // 内测免支付：直接到账并置顶
    const settled = await one(
      `UPDATE prop_orders
         SET status = 'paid',
             "paidAt" = now(),
             "topUntil" = now() + make_interval(hours => $2::int)
       WHERE "_id" = $1
       RETURNING "topUntil"`,
      [id, TOP_HOURS]
    );
    await one('UPDATE orders SET "topUntil" = $2 WHERE "_id" = $1', [
      orderId,
      settled.topUntil
    ]);
    console.info('[propService] urgent card granted (demo):', orderId, settled.topUntil);
    return success({
      paid: true,
      payParams: null,
      amount: URGENT_CARD_PRICE,
      topUntil: settled.topUntil
    });
  }

  // TODO 正式虚拟支付：组装 requestVirtualPayment 签名参数返回前端
  console.warn('[propService] virtual payment not configured, buy blocked:', id);
  return fail('加急卡支付通道开通中，暂无法购买');
}
