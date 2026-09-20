-- 加急卡（置顶道具）：模式验证期唯一收费点
-- 1) 订单置顶截止时间：topUntil > now() 时大厅排序优先
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "topUntil" timestamptz;

-- 2) 虚拟道具订单（当前仅 urgentCard 加急卡；个人主体走微信个人虚拟支付）
CREATE TABLE IF NOT EXISTS public.prop_orders (
  "_id" varchar(32) PRIMARY KEY,
  "buyerOpenid" varchar(64) NOT NULL,
  "propType" varchar(32) NOT NULL DEFAULT 'urgentCard',
  "orderId" varchar(32) NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending', -- pending -> paid
  "wxTradeNo" varchar(64) NOT NULL DEFAULT '',
  "topUntil" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "paidAt" timestamptz
);
CREATE INDEX IF NOT EXISTS prop_orders_buyer_idx ON public.prop_orders ("buyerOpenid", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS prop_orders_order_idx ON public.prop_orders ("orderId");

-- 阻断小程序端直连
ALTER TABLE public.prop_orders ENABLE ROW LEVEL SECURITY;
