-- 接单人联系方式：接单时快照存入订单，供发单人查看
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "claimerContact" text DEFAULT '';
