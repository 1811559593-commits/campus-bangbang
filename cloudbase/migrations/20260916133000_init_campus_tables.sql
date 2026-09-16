-- 校园帮帮 初始 schema：users / orders / payments / reviews / reports
-- 列名保持与小程序端数据模型一致的 camelCase（PG 双引号界定），日期统一 timestamptz
-- 所有数据访问均经云函数用 service_role API Key 走 exec-pgsql；表开启 RLS 且不建策略，阻断外部直连

CREATE TABLE IF NOT EXISTS public.users (
  "_id" varchar(32) PRIMARY KEY,
  "_openid" varchar(64) NOT NULL,
  "openid" varchar(64) NOT NULL,
  "nickName" varchar(64) NOT NULL DEFAULT '校园用户',
  "avatar" text NOT NULL DEFAULT '',
  "phone" varchar(32) NOT NULL DEFAULT '',
  "contact" varchar(128) NOT NULL DEFAULT '',
  "school" varchar(64) NOT NULL DEFAULT '',
  "campus" varchar(64) NOT NULL DEFAULT '',
  "studentNo" varchar(64) NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  "creditScore" integer NOT NULL DEFAULT 100,
  bio text NOT NULL DEFAULT '',
  "isAdmin" boolean NOT NULL DEFAULT false,
  stats jsonb NOT NULL DEFAULT '{"avgScore":0,"ratingCount":0,"acceptedCount":0,"finishedCount":0,"finishRate":0,"violateCount":0,"avgResponseMin":0}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_openid_uniq ON public.users ("_openid");
CREATE INDEX IF NOT EXISTS users_verified_idx ON public.users (verified);

CREATE TABLE IF NOT EXISTS public.orders (
  "_id" varchar(32) PRIMARY KEY,
  "posterOpenid" varchar(64) NOT NULL,
  "posterName" varchar(64) NOT NULL DEFAULT '',
  "posterAvatar" text NOT NULL DEFAULT '',
  type varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  detail text NOT NULL DEFAULT '',
  school varchar(64) NOT NULL DEFAULT '',
  campus varchar(64) NOT NULL DEFAULT '',
  location varchar(128) NOT NULL DEFAULT '',
  classroom varchar(128) NOT NULL DEFAULT '',
  "expectTime" varchar(32) NOT NULL,
  price numeric(10,2) NOT NULL,
  "infoFeeRate" numeric(6,4) NOT NULL,
  "infoFee" numeric(10,2) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  contact varchar(128) NOT NULL DEFAULT '',
  "claimerOpenid" varchar(64),
  "claimerName" varchar(64),
  "claimedAt" timestamptz,
  "submittedAt" timestamptz,
  "completedAt" timestamptz,
  "proofNote" text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS orders_poster_idx ON public.orders ("posterOpenid", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS orders_claimer_idx ON public.orders ("claimerOpenid", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS public.payments (
  "_id" varchar(32) PRIMARY KEY,
  "outTradeNo" varchar(48) NOT NULL,
  "orderId" varchar(32) NOT NULL,
  "payerOpenid" varchar(64) NOT NULL,
  amount numeric(10,2) NOT NULL,
  "totalFee" integer NOT NULL,
  "feeRate" numeric(6,4) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  "wxTransactionId" varchar(64) NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "paidAt" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_tradeno_uniq ON public.payments ("outTradeNo");
CREATE INDEX IF NOT EXISTS payments_order_status_idx ON public.payments ("orderId", status);

CREATE TABLE IF NOT EXISTS public.reviews (
  "_id" varchar(32) PRIMARY KEY,
  "orderId" varchar(32) NOT NULL,
  "fromOpenid" varchar(64) NOT NULL,
  "fromName" varchar(64) NOT NULL DEFAULT '校园用户',
  "fromAvatar" text NOT NULL DEFAULT '',
  "toOpenid" varchar(64) NOT NULL,
  stars integer NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  content text NOT NULL DEFAULT '',
  role varchar(16) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_from_uniq ON public.reviews ("orderId", "fromOpenid");
CREATE INDEX IF NOT EXISTS reviews_to_created_idx ON public.reviews ("toOpenid", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS public.reports (
  "_id" varchar(32) PRIMARY KEY,
  "orderId" varchar(32) NOT NULL DEFAULT '',
  "reporterOpenid" varchar(64) NOT NULL,
  "targetOpenid" varchar(64) NOT NULL,
  reason text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(16) NOT NULL DEFAULT 'pending',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);

-- 信息费支付结算：幂等。支付成功（或内测免支付）时原子完成
-- payment -> paid、order pending -> claimed、接单人 acceptedCount + 1
CREATE OR REPLACE FUNCTION public.settle_info_fee(p_out_trade_no text, p_tx_id text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_claimer public.users%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE "outTradeNo" = p_out_trade_no FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_missing');
  END IF;
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true);
  END IF;

  UPDATE public.payments
     SET status = 'paid',
         "wxTransactionId" = COALESCE(NULLIF(p_tx_id, ''), "wxTransactionId"),
         "paidAt" = now()
   WHERE "_id" = v_payment."_id";

  SELECT * INTO v_order FROM public.orders WHERE "_id" = v_payment."orderId" FOR UPDATE;
  IF FOUND AND v_order.status = 'pending' THEN
    SELECT * INTO v_claimer FROM public.users WHERE "_openid" = v_payment."payerOpenid";

    UPDATE public.orders
       SET status = 'claimed',
           "claimerOpenid" = v_payment."payerOpenid",
           "claimerName" = COALESCE(v_claimer."nickName", '校园用户'),
           "claimedAt" = now()
     WHERE "_id" = v_order."_id";

    IF v_claimer."_id" IS NOT NULL THEN
      UPDATE public.users
         SET stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{acceptedCount}',
               (COALESCE((stats->>'acceptedCount')::int, 0) + 1)::text::jsonb,
               true
             )
       WHERE "_id" = v_claimer."_id";
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 阻断小程序端对 PG 的任何直连（业务数据只允许通过云函数访问）
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
