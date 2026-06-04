-- Phase 1-2 신규 테이블 3종
-- 실행: Supabase Dashboard → SQL Editor에 전체 붙여넣기 후 실행
-- 모든 테이블은 service_role(서버)에서만 접근. anon/authenticated policy 없음 = 클라이언트 접근 전면 차단.

-- ============================================================
-- 1. airroi_cache
--    AirROI API 응답 캐시 (90일). 동일 좌표 재호출 비용 절감.
--    lat/lng는 조회 전 소수점 4자리 반올림 정규화 필수 (airbnbData.ts).
-- ============================================================
create table if not exists airroi_cache (
  id          uuid        primary key default gen_random_uuid(),
  lat         numeric(10,6) not null,
  lng         numeric(10,6) not null,
  radius_m    int         not null default 1000,
  data        jsonb       not null,         -- AirROI 응답 원본
  fetched_at  timestamptz not null default now(),
  expires_at  timestamptz not null          -- fetched_at + interval '90 days'
);

create index if not exists airroi_cache_coords_idx
  on airroi_cache (lat, lng, radius_m);

create index if not exists airroi_cache_expires_idx
  on airroi_cache (expires_at);

-- RLS: 활성화. policy 없음 → anon/authenticated 접근 차단. service_role은 RLS 우회.
alter table airroi_cache enable row level security;


-- ============================================================
-- 2. report_purchases
--    Polar 결제 내역 + 리포트 접근 토큰.
--    polar_order_id UNIQUE → 웹훅 중복 수신 시 중복 발급 방지.
--    report_token UNIQUE → URL 직접 열거 차단.
--    토큰은 웹훅 핸들러에서 생성 후 INSERT (DB default 없음, 앱 책임).
-- ============================================================
create table if not exists report_purchases (
  id              uuid        primary key default gen_random_uuid(),
  polar_order_id  text        unique not null,  -- 웹훅 멱등성 키
  address         text        not null,
  lat             numeric(10,6),
  lng             numeric(10,6),
  report_token    text        unique not null,  -- /report/[token] 접근 키
  purchased_at    timestamptz not null default now(),
  accessed_at     timestamptz           -- 첫 열람 시각 (null = 미열람)
);

create index if not exists report_purchases_token_idx
  on report_purchases (report_token);

-- RLS: 활성화. policy 없음 → anon/authenticated 접근 차단. service_role은 RLS 우회.
alter table report_purchases enable row level security;


-- ============================================================
-- 3. airroi_usage
--    AirROI API 호출 모니터링. 비용 캡 집계 기준.
--    cache_hit = true 이면 실제 API 미호출 (비용 0).
-- ============================================================
create table if not exists airroi_usage (
  id         uuid        primary key default gen_random_uuid(),
  called_at  timestamptz not null default now(),
  endpoint   text        not null,
  cache_hit  boolean     not null default false
);

create index if not exists airroi_usage_called_at_idx
  on airroi_usage (called_at);

-- RLS: 활성화. policy 없음 → anon/authenticated 접근 차단. service_role은 RLS 우회.
alter table airroi_usage enable row level security;
