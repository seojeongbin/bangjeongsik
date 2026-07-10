-- Phase 2-2C: 에어비앤비 매물 핀 데이터 (유료 레이어)
-- 설계 근거: docs/PRD_master_reconciliation.md §1.D, §3 Step 2-2C
-- 실행: Supabase Dashboard → SQL Editor에 전체 붙여넣기 후 실행
--
-- ★ 노출 필드 화이트리스트 (변호사 상담 원칙 — 절대 준수) ★
-- 이 테이블은 아래 컬럼만 갖는다. 숙소명·호스트명·사진 URL·정확한 주소·
-- 개별 수익/예약률/객단가(performance) 컬럼은 "만들지 않는 것"으로 원천 차단한다.
-- AirROI 좌표는 exact_location=false 오차가 법적 안전장치(건물 특정 불가)로
-- 재해석되어 핀 위치 용도로만 사용 가능 (2026-07 확인). 단:
--   (a) 핀 클릭 시 개별 숙소 특정 정보 노출 금지
--   (b) 핀 좌표를 건축물대장 조회 입력으로 사용 금지 (오차 존재)

create table public.airbnb_pins (
  listing_key    text        primary key,  -- sha256(AirROI listing_id) hex — 원본 id 미보관(익명 키, 갱신 시 upsert 기준)
  lat            numeric(10,6) not null,
  lng            numeric(10,6) not null,
  dong           text        not null,     -- 행정동 이름 (경계 폴리곤 point-in-polygon 판정)
  bedrooms       int,                      -- 침실 수 (통계·필터 용도, 개별 특정 불가 정보)
  room_type      text,                     -- entire_home / private_room / shared_room
  exact_location boolean     not null default false,
  fetched_at     date        not null      -- 적재 기준일 (지도 범례 "OO 기준" 표시용)
);

comment on table public.airbnb_pins is
  '에어비앤비 매물 핀 (AirROI listings 검색 기반, 마포구 사전 적재). 화이트리스트 컬럼만 허용 — 숙소명·사진·개별 수익 컬럼 추가 금지 (PRD_master_reconciliation.md §1.D). 갱신: npm run fetch:airbnb-pins (수동).';

create index airbnb_pins_dong_idx on public.airbnb_pins (dong);

-- RLS: 활성화 + policy 없음 → 클라이언트 직접 조회 전면 차단.
-- 조회는 /api/map/airbnb-pins (로그인 + 크레딧 이력 검증 후 service role 읽기)로만.
alter table public.airbnb_pins enable row level security;
