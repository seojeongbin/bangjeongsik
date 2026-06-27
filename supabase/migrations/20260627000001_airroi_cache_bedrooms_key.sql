-- airroi_cache 캐시 키에 bedrooms/baths/guests 추가
-- 실행: Supabase Dashboard → SQL Editor에서 직접 실행 필요, 자동 적용 안 됨
-- 목적: 같은 좌표라도 방 스펙(bedrooms/baths/guests)이 다르면 별도 캐시 항목으로 관리

-- 1. 컬럼 추가
alter table airroi_cache add column if not exists bedrooms int;
alter table airroi_cache add column if not exists baths    numeric(3,1);
alter table airroi_cache add column if not exists guests   int;

-- 2. 기존 행 백필 (기존 데이터 전부 bedrooms=2, baths=1, guests=4 고정 호출 결과)
update airroi_cache
set    bedrooms = 2,
       baths    = 1,
       guests   = 4
where  bedrooms is null;

-- 3. NOT NULL 제약 추가 (백필 완료 후)
alter table airroi_cache alter column bedrooms set not null;
alter table airroi_cache alter column baths    set not null;
alter table airroi_cache alter column guests   set not null;

-- 4. 기존 인덱스 교체 → 캐시 키에 스펙 포함
drop index if exists airroi_cache_coords_idx;
create index if not exists airroi_cache_coords_idx
  on airroi_cache (lat, lng, radius_m, bedrooms, baths, guests);
