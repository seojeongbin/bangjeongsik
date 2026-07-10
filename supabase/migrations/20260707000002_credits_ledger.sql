-- Phase 2-2B: 크레딧 원장 + 웹훅 멱등성 + 원자적 차감 RPC
-- 설계 근거: docs/PRD_master_reconciliation.md §1.A, §3 Step 2-2B
-- 실행: Supabase Dashboard → SQL Editor에 전체 붙여넣기 후 실행 (20260707000001 선행 필수)

-- ============================================================
-- 1. credit_transactions — 크레딧 원장 (ledger)
--    잔액 컬럼 없음: 잔액 = SUM(delta). 증감은 전부 행 추가로만 기록
--    (감사 추적·환불·구독 지급이 모두 INSERT로 해결 — 이중 소스 금지).
-- ============================================================
create table public.credit_transactions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  delta      int         not null check (delta <> 0),
  reason     text        not null check (reason in (
                'signup_free', 'purchase_basic', 'purchase_pro',
                'subscription_monthly', 'consume_report', 'refund'
              )),
  ref_id     text,       -- Polar order id(지급) 또는 analysis_reports.id(차감)
  created_at timestamptz not null default now()
);

comment on table public.credit_transactions is
  '크레딧 원장. 잔액 = SUM(delta). 쓰기는 service role RPC만 — 사용자 INSERT/UPDATE/DELETE 전면 차단(RLS).';

create index credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

-- RLS: 본인 행 SELECT만. 쓰기 정책 없음(= service role/definer 함수만 가능)
alter table public.credit_transactions enable row level security;

create policy "credit_transactions_select_own"
  on public.credit_transactions for select
  using (auth.uid() = user_id);


-- ============================================================
-- 2. webhook_events — 웹훅 멱등성 (이중 지급 방지)
--    event_id = '<이벤트타입>:<Polar order id>' (Polar 페이로드에 자체
--    이벤트 id가 없어 order id 조합으로 구성). PK 충돌 = 중복 수신 → 스킵.
-- ============================================================
create table public.webhook_events (
  event_id    text        primary key,
  event_type  text        not null,
  checkout_id text,       -- /checkout/success 폴링용 (Polar checkout id)
  received_at timestamptz not null default now()
);

comment on table public.webhook_events is
  '웹훅 중복 수신 방지 원장. event_id UNIQUE(PK)가 크레딧 이중 지급을 막는 핵심.';

create index webhook_events_checkout_idx
  on public.webhook_events (checkout_id);

-- RLS: 활성화. policy 없음 → 클라이언트 접근 전면 차단. service_role만.
alter table public.webhook_events enable row level security;


-- ============================================================
-- 3. analysis_reports — 신규 분석 리포트 (로그인 계정 귀속)
--    Step 2-2D 스키마를 선행 생성 — consume_credit_and_create_report RPC가
--    차감과 리포트 생성을 단일 트랜잭션으로 묶기 위해 이 테이블에 의존.
--    report_token은 재열람 URL 식별자일 뿐, 접근 권한은 user_id 소유 검증(RLS).
-- ============================================================
create table public.analysis_reports (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references auth.users(id) on delete cascade,
  lat          numeric(10,6) not null,
  lng          numeric(10,6) not null,
  radius_m     int           not null check (radius_m in (100, 250, 500, 1000, 2000)),
  bedrooms     int           not null check (bedrooms between 1 and 4),
  baths        numeric(2,1)  not null check (baths > 0),
  guests       int           not null check (guests between 1 and 16),
  address      text,         -- 주소 직접 입력 경로에서만 채워짐 (핀 경로는 null)
  report_token text          unique not null,
  created_at   timestamptz   not null default now()
);

comment on table public.analysis_reports is
  '신규 분석 리포트(크레딧 차감 시 생성). 소유 검증은 user_id + RLS — report_token 단독 접근 모델은 기존 report_purchases만 유지.';

create index analysis_reports_user_idx
  on public.analysis_reports (user_id, created_at desc);

-- RLS: 본인 행 SELECT만. 쓰기는 RPC(definer)/service role만.
alter table public.analysis_reports enable row level security;

create policy "analysis_reports_select_own"
  on public.analysis_reports for select
  using (auth.uid() = user_id);


-- ============================================================
-- 4. grant_free_credit — 가입 Free 1회 지급 (원자·멱등)
--    profiles.free_credit_granted UPDATE의 행 잠금이 동시 호출을 직렬화 →
--    이중 지급 불가. 반환 true = 이번 호출로 지급됨 / false = 이미 지급됨.
--    호출 주체: service role(supabaseAdmin)만 — /auth/callback.
-- ============================================================
create function public.grant_free_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  -- 트리거 누락 등 예외 상황 대비: profiles 행 보장 (멱등)
  insert into public.profiles (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.profiles
     set free_credit_granted = true
   where user_id = p_user_id
     and free_credit_granted = false;

  if not found then
    return false; -- 이미 지급됨 (계정당 1회 보장)
  end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (p_user_id, 1, 'signup_free', null);

  return true;
end;
$$;

revoke execute on function public.grant_free_credit(uuid) from public, anon, authenticated;


-- ============================================================
-- 5. grant_purchase_credits — 결제 웹훅 크레딧 지급 (원자·멱등)
--    webhook_events INSERT의 PK 충돌 검사와 크레딧 INSERT가 단일 트랜잭션 —
--    중복 웹훅이 와도 지급은 정확히 1회. 반환 true = 지급 / false = 중복 스킵.
--    호출 주체: service role(supabaseAdmin)만 — /api/webhooks/polar.
-- ============================================================
create function public.grant_purchase_credits(
  p_event_id    text,
  p_event_type  text,
  p_checkout_id text,
  p_user_id     uuid,
  p_delta       int,
  p_reason      text,
  p_ref_id      text
) returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.webhook_events (event_id, event_type, checkout_id)
  values (p_event_id, p_event_type, p_checkout_id)
  on conflict (event_id) do nothing;

  if not found then
    return false; -- 중복 웹훅 — 이미 처리됨
  end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (p_user_id, p_delta, p_reason, p_ref_id);

  return true;
end;
$$;

revoke execute on function public.grant_purchase_credits(text, text, text, uuid, int, text, text)
  from public, anon, authenticated;


-- ============================================================
-- 6. consume_credit_and_create_report — 원자적 차감 + 리포트 생성
--    profiles 행 FOR UPDATE 잠금으로 사용자 단위 직렬화 → 연타·동시 요청의
--    이중 차감 방지. 잔액 부족 시 예외로 전체 롤백.
--    호출 주체: service role(supabaseAdmin)만 — POST /api/analysis (Step 2-2D).
-- ============================================================
create function public.consume_credit_and_create_report(
  p_user_id  uuid,
  p_lat      numeric,
  p_lng      numeric,
  p_radius_m int,
  p_bedrooms int,
  p_baths    numeric,
  p_guests   int,
  p_address  text default null
) returns table (report_id uuid, report_token text, balance int)
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance   int;
  v_report_id uuid;
  v_token     text;
begin
  -- 사용자 단위 직렬화 (동시 차감 방지의 핵심)
  perform 1 from public.profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select coalesce(sum(t.delta), 0) into v_balance
    from public.credit_transactions t
   where t.user_id = p_user_id;

  if v_balance < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_token := gen_random_uuid()::text;

  insert into public.analysis_reports
    (user_id, lat, lng, radius_m, bedrooms, baths, guests, address, report_token)
  values
    (p_user_id, p_lat, p_lng, p_radius_m, p_bedrooms, p_baths, p_guests, p_address, v_token)
  returning id into v_report_id;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (p_user_id, -1, 'consume_report', v_report_id::text);

  return query select v_report_id, v_token, v_balance - 1;
end;
$$;

revoke execute on function public.consume_credit_and_create_report(uuid, numeric, numeric, int, int, numeric, int, text)
  from public, anon, authenticated;


-- ============================================================
-- 7. get_my_credit_balance — 현재 로그인 사용자 잔액 조회
--    security invoker + RLS(select_own) — 남의 잔액 조회 불가.
--    호출 주체: authenticated (server-user 클라이언트 rpc).
-- ============================================================
create function public.get_my_credit_balance()
returns int
language sql
stable
security invoker set search_path = public
as $$
  select coalesce(sum(delta), 0)::int
    from public.credit_transactions
   where user_id = auth.uid();
$$;

revoke execute on function public.get_my_credit_balance() from public, anon;
grant execute on function public.get_my_credit_balance() to authenticated;
