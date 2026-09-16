const { one } = require('./helper');

// 微信支付结果回调：幂等地把信息费置为已支付、订单置为“已接单”并解锁联系方式。
// 原子逻辑收敛在 PG 函数 settle_info_fee 中，重复回调天然幂等。
exports.main = async (event) => {
  try {
    const outTradeNo = event.outTradeNo || event.out_trade_no;
    const transactionId = event.transactionId || event.transaction_id || '';
    const returnCode = event.returnCode || event.return_code;
    const resultCode = event.resultCode || event.result_code;
    console.info('[payCallback] received:', { returnCode, resultCode, outTradeNo });

    if (!outTradeNo) return { errcode: 0, errmsg: 'OK' };
    if (returnCode && returnCode !== 'SUCCESS') return { errcode: 0, errmsg: 'OK' };
    if (resultCode && resultCode !== 'SUCCESS') return { errcode: 0, errmsg: 'OK' };

    const row = await one('SELECT public.settle_info_fee($1, $2) AS result', [
      outTradeNo,
      transactionId
    ]);
    const result = row && row.result;
    if (result && result.ok === false && result.reason === 'payment_missing') {
      console.error('[payCallback] payment not found:', outTradeNo);
      return { errcode: 0, errmsg: 'OK' };
    }

    console.info('[payCallback] settle done:', outTradeNo, result);
    return { errcode: 0, errmsg: 'OK' };
  } catch (err) {
    console.error('[payCallback] error:', err);
    // 返回非 0 让支付平台稍后重试回调
    return { errcode: -1, errmsg: err.message || 'FAIL' };
  }
};
