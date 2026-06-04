-- report_purchases에 Polar checkout_id 컬럼 추가
-- 결제 완료 성공 페이지에서 checkout_id로 report_token 조회할 때 사용
-- Supabase Dashboard → SQL Editor에서 실행

ALTER TABLE report_purchases
  ADD COLUMN IF NOT EXISTS checkout_id text;

CREATE INDEX IF NOT EXISTS report_purchases_checkout_id_idx
  ON report_purchases (checkout_id);
