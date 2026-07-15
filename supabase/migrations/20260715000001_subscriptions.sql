-- Phase 2-2H: 월간 구독 상태 테이블 + 상태 동기화 RPC
-- 설계 근거: docs/PRD_phase2-2H_subscription.md
-- 실행: Supabase Dashboard → SQL Editor에 전체 붙여넣기 후 실행
--       (20260707000001 profiles, 20260707000002 credits_ledger 선행 필수)
--
-- 크레딧 지급은 이 테이블이 아니라 기존 credit_transactions 원장으로만 발생
-- (reason = 'subscription_monthly' — 20260707000002 CHECK 제약에 이미 예약됨).
-- 이 테이블은 "구독 상태 표시·중복 구독 방지·고객 포털 연결"용 미러일 뿐,
-- 잔액 계산에 절대 개입하지 않는다 (이중 소스 금지 원칙).

-- ============================================================
-- 1. subscriptions — Polar 구독 상태 미러
-- ============================================================
create table public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references auth.users(id) on delete cascade,
  polar_subscription_id  text        unique not null,
  polar_customer_id      text        not null,
  product_id             text,
  status                 text        not null check (status in (
                           'incomplete', 'incomplete_expired', 'trialing',
                           'active', 'past_due', 'canceled', 'unpaid'
                         )),
  cancel_at_period_end   boolean     not null default false,
  current_period_end     timestamptz,
  started_at             timestamptz,
  ends_at                timestamptz,
  -- Polar 이벤트 역순 도착 가드: 이보다 오래된 페이로드는 상태를 덮어쓰지 않음
  polar_modified_at      timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Polar 구독 상태 미러 (Phase 2-2H). 크레딧 지급·잔액과 무관 — 지급은 credit_transactions 원장에서만. 쓰기는 service role RPC만.';

create index subscriptions_user_idx
  on public.subscriptions (user_id, created_at desc);

-- RLS: 본인 행 SELECT만. 쓰기 정책 없음(= service role/definer 함수만 가능)
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);


-- ============================================================
-- 2. upsert_subscription_state — 웹훅 구독 상태 동기화 (원자·순서 안전)
--    polar_subscription_id 기준 upsert. 웹훅 전달 순서가 보장되지 않으므로
--    p_polar_modified_at이 저장된 값보다 오래된 페이로드는 무시(stale guard).
--    p_user_id는 최초 INSERT에만 필요 — 이후 이벤트에서 null이어도 기존 행 갱신 가능.
--    반환: 'inserted' | 'updated' | 'stale_skipped' | 'no_user_skipped'
--    호출 주체: service role(supabaseAdmin)만 — /api/webhooks/polar.
-- ============================================================
create function public.upsert_subscription_state(
  p_polar_subscription_id text,
  p_user_id               uuid,
  p_polar_customer_id     text,
  p_product_id            text,
  p_status                text,
  p_cancel_at_period_end  boolean,
  p_current_period_end    timestamptz,
  p_started_at            timestamptz,
  p_ends_at               timestamptz,
  p_polar_modified_at     timestamptz
) returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_existing_modified timestamptz;
begin
  select polar_modified_at into v_existing_modified
    from public.subscriptions
   where polar_subscription_id = p_polar_subscription_id
   for update;

  if found then
    -- 역순 도착 가드: 더 오래된 이벤트가 최신 상태를 덮어쓰지 않도록
    if v_existing_modified is not null
       and p_polar_modified_at is not null
       and p_polar_modified_at < v_existing_modified then
      return 'stale_skipped';
    end if;

    update public.subscriptions
       set polar_customer_id    = p_polar_customer_id,
           product_id           = p_product_id,
           status               = p_status,
           cancel_at_period_end = p_cancel_at_period_end,
           current_period_end   = p_current_period_end,
           started_at           = p_started_at,
           ends_at              = p_ends_at,
           polar_modified_at    = coalesce(p_polar_modified_at, polar_modified_at),
           updated_at           = now()
     where polar_subscription_id = p_polar_subscription_id;

    return 'updated';
  end if;

  -- 신규 행 — user_id 필수 (metadata.user_id 누락 시 호출부에서 알림 처리)
  if p_user_id is null then
    return 'no_user_skipped';
  end if;

  insert into public.subscriptions
    (polar_subscription_id, user_id, polar_customer_id, product_id, status,
     cancel_at_period_end, current_period_end, started_at, ends_at, polar_modified_at)
  values
    (p_polar_subscription_id, p_user_id, p_polar_customer_id, p_product_id, p_status,
     p_cancel_at_period_end, p_current_period_end, p_started_at, p_ends_at, p_polar_modified_at);

  return 'inserted';
end;
$$;

revoke execute on function public.upsert_subscription_state(
  text, uuid, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
