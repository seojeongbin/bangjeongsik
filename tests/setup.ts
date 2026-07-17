// 모든 테스트 공통 셋업 — 더미 환경변수 주입.
// 실 Supabase/Polar/Resend 키가 로컬 .env에 있어도 테스트가 절대 실 서비스를
// 때리지 않도록, 모듈 import 전에 더미 값으로 덮어쓴다 (과금·데이터 오염 방지).

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.POLAR_ACCESS_TOKEN = 'test-polar-token'
process.env.POLAR_PRODUCT_ID_BASIC = 'prod_basic_test'
process.env.POLAR_PRODUCT_ID_PRO = 'prod_pro_test'
process.env.POLAR_SUBSCRIPTION_ID_BASIC = 'prod_sub_basic_test'

// alert(Resend)는 각 테스트에서 모킹하지만, 미모킹 경로가 있어도 no-op이 되도록
// 키를 비워둔다 (sendAlertEmail은 RESEND_API_KEY 없으면 즉시 return).
delete process.env.RESEND_API_KEY
delete process.env.ALERT_EMAIL

process.env.AIRROI_API_KEY = 'test-airroi-key'
