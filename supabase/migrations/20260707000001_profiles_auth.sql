-- Phase 2-2A: Supabase Auth 도입 — profiles 테이블 + 자동 생성 트리거 + RLS
-- 설계 근거: docs/PRD_phase2-2A_auth.md §3, §4

create table public.profiles (
  user_id             uuid primary key
                        references auth.users(id) on delete cascade,
  free_credit_granted boolean not null default false,
  created_at          timestamptz not null default now()
);

comment on table public.profiles is 'auth.users 1:1 확장. 계정당 1행 보장(트리거).';
comment on column public.profiles.free_credit_granted is
  'Free 1회 크레딧 지급 완료 플래그. 계정당 1회 보장용. 실제 지급/이 값 변경은 Step 2-2B의 service role 트랜잭션에서만. 사용자 UPDATE 절대 금지(RLS).';

-- auth.users INSERT 시 profiles 행 자동 생성 (멱등)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: 본인 행만 SELECT. INSERT/UPDATE/DELETE는 사용자 정책 없음(전면 차단) — service role(supabaseAdmin)만 가능
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);
