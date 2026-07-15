# PRD — Phase 2-2A: 인증 기반 (Supabase Auth: 카카오·구글 OAuth)

> 작성일: 2026-07-07 / 상태: 설계 확정 (구현 전)
> 상위 문서: `docs/PRD_master_reconciliation.md` §3 Step 2-2A
> 범위: **설계만**. 코드 작성은 다음 스텝(Sonnet).
> 산출물: (1) `profiles` 테이블 스키마, (2) RLS 정책, (3) 세션 미들웨어 보호 범위.
> 상위 스텝과의 경계: **크레딧 원장·Free 지급 로직·차감 RPC는 Step 2-2B 소관.** 2-2A는 "로그인이 되고, 계정마다 profiles 행이 하나 존재하며, 보호 경로에 세션 게이트가 걸린다"까지만 책임진다.

---

## 0. 설계 결정 요약 (먼저 읽기)

| # | 결정 | 근거 |
|---|------|------|
| D1 | 세션 전략 = **`@supabase/ssr` 쿠키 기반** (PKCE flow) | Next.js App Router에서 Server Component·Route Handler·미들웨어가 세션을 공유하는 표준 방식. 로컬스토리지 기반(`supabase-js` 단독)은 서버에서 세션을 못 읽어 SSR·미들웨어 게이트가 불가능 |
| D2 | Supabase 클라이언트 **3종 분리** (아래 §2) | "누구로서 쿼리하는가"가 3가지(브라우저 사용자 / 서버 사용자 / 서버 관리자)로 갈림. 기존 2개 파일은 유지, 신규 2개 추가 |
| D3 | profiles 행 생성 = **`auth.users` INSERT 트리거** (SECURITY DEFINER) | 앱 코드 의존 없이 "가입 = profiles 행 존재"를 DB가 보장. `/auth/callback`에서의 앱 레벨 upsert보다 경쟁·누락에 강함 |
| D4 | 미들웨어 = **세션 쿠키 갱신(전역) + 보호 페이지 리다이렉트(좁게)**. API 인가는 **핸들러 내부 + RLS**가 최종 방어선 | CLAUDE.md 원칙 "URL 숨김·로그인만으로 보안 처리 금지"의 계승. report_token 검증 → 세션+RLS 검증으로 방어선 이동 |
| D5 | 사용자 식별키 = **`auth.users.id` (uuid)**, 이메일 아님 | 카카오는 이메일 scope 미동의 시 email이 null일 수 있음. 이메일을 PK/조인키로 쓰면 카카오 로그인에서 깨짐 |

---

## 1. OAuth 플로우 (카카오·구글, PKCE)

```
[클라이언트]
  supabase.auth.signInWithOAuth({
    provider: 'kakao' | 'google',
    options: { redirectTo: `${origin}/auth/callback?next=/explore` }
  })
        │
        ▼
[Provider 로그인]  (Kakao / Google 동의 화면)
        │
        ▼
[Supabase Auth]  https://<project>.supabase.co/auth/v1/callback
        │  code 발급
        ▼
[앱] GET /auth/callback?code=...&next=...   ← 신규 Route Handler
        │  supabase.auth.exchangeCodeForSession(code)
        │  → HttpOnly 세션 쿠키 set
        ▼
[리다이렉트] next(기본 /explore)
```

- **신규 라우트 1개**: `src/app/auth/callback/route.ts` — code→세션 교환 후 `next`로 리다이렉트. **반드시 공개**(로그인 전 접근하는 경로).
- 첫 로그인 시 D3 트리거가 `profiles` 행을 자동 생성.
- **Free 1회 크레딧 지급은 여기서 하지 않는다** — Step 2-2B의 원자적 지급 로직(잔액 조작·이중지급 방지가 필요한 돈 로직)에서 처리. 2-2A는 `free_credit_granted=false` 상태의 profiles 행만 존재시킨다.

### 담당자 수동 작업 (콘솔 — 코드 아님)
- Supabase Dashboard → Authentication → Providers → **Kakao / Google 활성화**
  - Kakao: REST API 키 = client id, client secret 등록. **email scope 동의항목** 설정(선택 동의 가능성 → email null 대비 D5)
  - Google: OAuth 2.0 client id/secret 등록
- Supabase → Auth → URL Configuration: **Site URL** + **Redirect allowlist**에 프로덕션 도메인 및 `http://localhost:3000/auth/callback` 등록
- Provider 콘솔의 Redirect URI에 `https://<project>.supabase.co/auth/v1/callback` 등록

---

## 2. Supabase 클라이언트 구조 (기존 2 + 신규 2)

| 파일 | 정체 | 키 | RLS | 용도 |
|------|------|----|----|------|
| `src/lib/supabase/client.ts` (기존, 유지) | plain 브라우저 | anon | — | Phase 0~1 기존 공개 읽기. **당장 변경 안 함**(파급 최소) |
| `src/lib/supabase/server.ts` → `supabaseAdmin` (기존, 유지) | service role | service_role | **우회** | 웹훅·크레딧 지급·특권 쓰기 전용 |
| `src/lib/supabase/browser.ts` (**신규**) | `createBrowserClient` (`@supabase/ssr`) | anon | 적용 | 로그인 상태 인지 브라우저 컴포넌트(로그인 버튼·세션 훅) |
| `src/lib/supabase/server-user.ts` (**신규**) | `createServerClient` (`@supabase/ssr`) | anon + 쿠키 JWT | **적용(사용자로서)** | Server Component·보호 Route Handler에서 "현재 로그인 사용자"로 쿼리 |

**CLAUDE.md 규칙 진화 필요 (D2 파급 — 이번엔 표기만, 실제 수정은 구현 스텝)**
현재 CLAUDE.md는 "Route Handler·웹훅·데이터 레이어는 반드시 `supabaseAdmin` 사용"이라 못박음. 2-2A 이후 규칙은 다음으로 세분화되어야 한다:
- **특권 쓰기**(크레딧 지급/차감, 웹훅, 백필) → `supabaseAdmin` (RLS 우회)
- **사용자 소유 데이터 읽기/쓰기**(내 리포트, 내 잔액) → `server-user.ts` (RLS가 소유 검증)
- 이 규칙 변경은 구현 스텝에서 CLAUDE.md에 반영.

> `@supabase/ssr` 패키지 신규 추가 필요 → CLAUDE.md "새 라이브러리 추가 전 확인" 대상. 본 설계가 그 확인 요청을 겸함(Supabase 공식 App Router 권장 패키지).

---

## 3. `profiles` 테이블 스키마

`auth.users`(Supabase 기본 제공)를 부모로 하는 1:1 확장 테이블.

```sql
create table public.profiles (
  user_id             uuid primary key
                        references auth.users(id) on delete cascade,
  free_credit_granted boolean not null default false,
  created_at          timestamptz not null default now()
);

comment on table  public.profiles is 'auth.users 1:1 확장. 계정당 1행 보장(트리거).';
comment on column public.profiles.free_credit_granted is
  'Free 1회 크레딧 지급 완료 플래그. 계정당 1회 보장용. 실제 지급/이 값 변경은 Step 2-2B의 service role 트랜잭션에서만. 사용자 UPDATE 절대 금지(RLS).';
```

### 필드 근거
- `user_id` PK ← FK `auth.users(id)`, **on delete cascade**: 계정 삭제 시 profiles 자동 정리.
- `free_credit_granted`: Free 지급 멱등 가드. **값을 바꿀 수 있는 주체는 service role뿐**(RLS로 사용자 UPDATE 차단) — 사용자가 스스로 true→false로 되돌려 무한 재지급하는 어뷰징 원천 차단.
- `created_at`: 가입 시각.
- **의도적으로 넣지 않은 것**: 잔액 컬럼 없음. 잔액은 `credit_transactions` SUM(delta)로 계산(2-2B, 원장 방식). profiles에 잔액을 두면 원장과 이중 소스가 됨 → 금지.
- 닉네임·프로필 이미지 등은 현재 범위 밖(필요 시 후속 컬럼 추가).

### 행 자동 생성 트리거 (D3)
```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;   -- 멱등
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```
- `security definer` + `on conflict do nothing`: RLS 우회하여 삽입, 중복 무해.
- `search_path` 고정: definer 함수 보안 권장 관행.

---

## 4. RLS 정책 (`profiles`)

```sql
alter table public.profiles enable row level security;

-- 조회: 본인 행만
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

-- INSERT / UPDATE / DELETE: 사용자 정책 없음(= 전면 차단)
--   · INSERT는 D3 트리거(security definer)가 담당
--   · UPDATE(free_credit_granted 조작)·DELETE는 service role만 가능
```

### 정책 설계 근거
- **SELECT `auth.uid() = user_id`**: 남의 profiles 조회 불가. `auth.uid()`는 쿠키 JWT에서 Supabase가 주입.
- **INSERT 정책 없음**: 사용자가 임의 행을 못 만든다. 행 생성은 트리거(definer)만. → 위조 계정 행 삽입 차단.
- **UPDATE 정책 없음**: `free_credit_granted`를 사용자가 못 바꾼다(어뷰징 방지의 핵심). 값 변경은 2-2B의 service role 트랜잭션만.
- **DELETE 정책 없음**: 계정 삭제는 `auth.users` cascade로만.
- **service role은 모든 RLS를 우회** → 기존 `supabaseAdmin` 라우트 및 2-2B 지급 로직은 정책 무관하게 동작. 따라서 **RLS 활성화가 기존 코드에 주는 파급 = 0**(기존 라우트는 전부 service role).

### 2-2B로 넘기는 가드 (여기서 명시만)
- Free 지급은 `free_credit_granted=false` 확인 → `credit_transactions`에 +1 INSERT → 플래그 true, **단일 트랜잭션/RPC로 원자화**. 동시 첫 요청 2건이 각각 지급하는 이중지급을 이 원자성으로 막는다(2-2A는 컬럼·기본값만 제공).

---

## 5. 세션 미들웨어 보호 범위 (D4)

파일: `src/middleware.ts` (신규, 프로젝트에 미들웨어 없음).

### 미들웨어의 두 역할
1. **세션 쿠키 갱신 (전역, 필수)**: `@supabase/ssr`의 `updateSession` 패턴 — 매 요청마다 만료 임박 토큰을 갱신해 쿠키 재기록. 이걸 안 하면 SSR에서 세션이 산발적으로 만료됨. **보호 여부와 무관하게 매칭 대상 전체에 적용.**
2. **보호 페이지 리다이렉트 (좁게)**: 미로그인으로 보호 경로 접근 시 로그인으로 유도.

### 경로 분류

| 구분 | 경로 | 세션 요구 | 처리 |
|------|------|-----------|------|
| **공개(미끼)** | `/`, `/explore`, `/map` | ❌ | 로그인 없이 완전 동작. 동 지도·외도민 핀·경쟁밀도는 무료 레이어 |
| **공개 API** | `/api/map/listings`, `/api/explore/competition`, `/api/map/area-stats`, `/api/competition`, `/api/building`, `/api/waitlist` | ❌ | 무료 레이어 데이터 소스. 게이트 걸지 않음 |
| **웹훅(예외)** | `/api/webhooks/polar` | ❌(세션 개념 없음) | **미들웨어 매처에서 제외.** 인증은 Polar 서명 검증으로. 세션 게이트 절대 금지(Polar는 쿠키 없이 호출) |
| **콜백(예외)** | `/auth/callback` | ❌ | 로그인 전 접근 경로 → 공개 필수 |
| **보호 — 핀 레이어** | `/api/map/airbnb-pins` *(2-2C 신설 예정)* | ✅ 세션 | 에어비앤비 핀 = 유료 가치. 미로그인 401 |
| **보호 — 분석** | `POST /api/analysis`, `GET /api/analysis/[id]` *(2-2D 신설 예정)* | ✅ 세션 + 소유/크레딧 | 분석 실행·재열람. 크레딧·소유 검증은 핸들러/RPC/RLS |

> 보호 대상 API 2종은 **아직 파일이 없다**(2-2C·2-2D에서 생성). 2-2A 미들웨어는 이 경로 prefix를 보호 목록에 **미리 등록**해 두고, 실제 핸들러가 생기면 그대로 게이트가 적용되도록 설계한다.

### 게이트를 어디에 둘 것인가 (다층 방어)
- **미들웨어**: 보호 **페이지** 접근 시 리다이렉트(coarse). 세션 쿠키 갱신은 전역.
- **Route Handler(API)**: `server-user.ts`로 `auth.getUser()` 확인 → 없으면 401. **API의 실질 게이트는 여기.** (미들웨어 매처 오설정에 대한 방어 + 명시적 상태코드)
- **RLS**: 사용자 소유 데이터(내 리포트·잔액)의 **최종 방어선**. 세션이 뚫려도 남의 데이터는 못 읽음.
- 이 3층 구조가 CLAUDE.md "URL 숨김·로그인만으로 보안 처리 금지"의 새 구현. report_token 단독 방어 → 세션+핸들러검증+RLS 3층으로 대체.

### matcher 스케치 (설계 의도만; 구현 스텝에서 확정)
```
config.matcher: 다음을 제외한 전 경로
  - /_next/static, /_next/image, /favicon.ico, 정적 asset (*.png 등)
  - /api/webhooks/*   ← 웹훅은 세션 로직 자체를 태우지 않음
```
- 위 매처 전체에서 **세션 갱신(역할 1)** 수행.
- 그중 보호 페이지 prefix(향후 분석 전용 화면 등)에서만 **리다이렉트(역할 2)**.
- 공개 페이지(`/explore` 등)는 매처에 포함되되 갱신만 하고 게이트 안 함(로그인 시 세션 유지 목적).

---

## 6. 신규/변경 파일 목록 (구현 스텝 대비, 코드 없음)

| 경로 | 신규/변경 | 내용 |
|------|-----------|------|
| `package.json` | 변경 | `@supabase/ssr` 의존성 추가 |
| `src/lib/supabase/browser.ts` | 신규 | `createBrowserClient` |
| `src/lib/supabase/server-user.ts` | 신규 | `createServerClient`(쿠키 기반, RLS 사용자) |
| `src/middleware.ts` | 신규 | 세션 갱신 + 보호 리다이렉트 |
| `src/app/auth/callback/route.ts` | 신규 | OAuth code→세션 교환 |
| 로그인/로그아웃 UI (위치 미정) | 신규 | `signInWithOAuth`(kakao/google) 버튼, 세션 표시 |
| DB 마이그레이션 | 신규 | `profiles` 테이블 + 트리거 + RLS (§3·§4) |
| `src/lib/supabase/client.ts` | 유지 | 당장 변경 없음(점진 이관) |
| `src/lib/supabase/server.ts` | 유지 | `supabaseAdmin` 그대로 |
| CLAUDE.md | 변경(구현 스텝) | 클라이언트 3종 규칙·`@supabase/ssr` 반영 |

---

## 7. 환경변수

| 변수 | 상태 | 비고 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 기존 | 재사용 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존 | 브라우저/서버-사용자 클라이언트가 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 기존 | 특권 쓰기 전용, `NEXT_PUBLIC_` 금지 유지 |
| Kakao/Google client id·secret | 신규 | **Supabase Dashboard에만** 저장(코드/앱 env 아님) |

- 앱 코드에는 OAuth secret이 들어가지 않는다(Supabase가 대행). 앱은 anon key만 사용.

---

## 8. 리스크 / 확인 필요 (구현 전 실증)

1. **카카오 email null**: 이메일 미동의 계정 존재 가능. 식별·조인은 uuid로(D5). email 필수 UI 만들지 말 것.
2. **`@supabase/ssr` + Next 16 미들웨어 쿠키 API**: 쿠키 set/get 시그니처가 버전에 민감. 구현 시 설치된 버전 문서로 `updateSession` 패턴 실증(가정 금지). *(참고: `package.json`의 `next`는 16.2.1 — CLAUDE.md의 "Next.js 14" 표기와 불일치. 본 설계는 실제 설치 버전 16 기준. CLAUDE.md 표기 정정은 별도 확인 후.)*
3. **RLS 활성화 회귀**: 기존 라우트는 전부 service role이라 파급 0으로 판단되나, 구현 후 `/explore` 무료 플로우 회귀 테스트로 확인.
4. **웹훅 매처 제외 누락 시 사고**: `/api/webhooks/polar`가 세션 로직에 걸리면 결제 이벤트 유실. 매처 제외를 테스트로 못박을 것.
5. **어뷰징 완전 방어는 범위 밖**(마스터 문서 §4): 소셜 계정 생성 비용이 1차 방어. 기기/전화 검증은 실피해 관측 후.

---

## 9. 완료 정의 (Step 2-2A DoD)

- [ ] 카카오·구글로 로그인/로그아웃이 프로덕션에서 동작
- [ ] 로그인 시 `profiles` 행이 자동 생성(트리거), `free_credit_granted=false`
- [ ] `profiles` RLS: 본인 행만 SELECT, UPDATE/DELETE/INSERT 사용자 차단 확인
- [ ] 미들웨어가 세션 쿠키를 갱신(로그인 상태가 새로고침·SSR에서 유지)
- [ ] `/api/webhooks/polar`가 미들웨어 세션 로직에서 제외됨(결제 회귀 없음)
- [ ] `/explore` 무료 레이어가 미로그인에서 정상(회귀 없음)
- [ ] 보호 경로 prefix가 미들웨어에 등록되어, 2-2C·2-2D 핸들러 생성 시 즉시 게이트 적용
