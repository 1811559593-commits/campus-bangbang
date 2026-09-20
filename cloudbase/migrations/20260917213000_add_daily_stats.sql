-- 日流水统计表：订单完成时按天累加订单金额
CREATE TABLE IF NOT EXISTS public.daily_stats (
  stat_date date PRIMARY KEY,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 阻断小程序端直连
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
