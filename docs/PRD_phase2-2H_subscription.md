# PRD Phase 2-2H — 월간 구독 (2026-07-15)

## 0. 스펙 해석 확정 (최상단 명시)

원문(향후 개발단계.txt): **"정기결제 : 월간 Basic 자동 구독시 월1회 무료"**

| | 해석A: 월정액 → 월 크레딧 정기지급 | 해석B: 구독 = 월 1회 무료만 |
|---|---|---|
| 구현 복잡도 | 웹훅 주기 지급 필요 (기존 order.paid 패턴 재사용으로 낮음) | 동일한 주기 지급 로직이 어차피 필요 |
| 매출 | 월 9,900원 반복 매출 | 구독료 없이 무료만 주면 상품 불성립, 구독료를 받으면 "무료 1회에 월정액"이라 가치 불균형 |
| 사용자 가치 | 매달 4회 = 단건 Basic(3회)과 같은 가격에 +1회 | 1회/월로는 탐색 수요(여러 후보지 비교) 미충족 |

**결정: 해석A를 골격으로 하고 "월 1회 무료"를 구독 보너스로 해석.**
→ **월간 Basic = 월 9,900원 자동결제, 매 결제 주기마다 크레딧 4회(Basic 3회 + 무료 1회) 지급.**
단건 Basic과 같은 가격에 매달 1회가 더 얹히는 구조가 원문("Basic 자동 구독 시 월 1회 무료")과 정확히 일치하고, 원장에는 주기당 `+4` 한 행(`reason='subscription_monthly'` — 20260707000002 CHECK 제약에 이미 예약된 값)으로 남아 기존 크레딧 구조와 가장 깔끔하게 붙는다.

## 1. 설계 원칙 — 기존 구조 위의 레이어

- **크레딧 지급은 `order.paid` 웹훅에서만** (billingReason = `subscription_create` | `subscription_cycle`).
  - Polar는 구독의 매 결제 주기마다 새 order를 생성하고 `order.paid`를 발송 → order.id 기반 기존 멱등성(`grant_purchase_credits` + `webhook_events`)이 주기별 중복 지급을 그대로 막는다.
  - 결제가 실제로 잡힌 이벤트에서만 지급하므로 **결제 실패/연체 시 크레딧 미지급이 자동 충족** (past_due 상태는 기록만 되고 지급 없음).
  - `subscription_update`(비례정산 주문)는 지급 제외.
- **`subscription.*` 웹훅은 상태 미러 동기화만** — `subscriptions` 테이블(신규, 20260715000001)에 upsert. 크레딧·잔액에 절대 개입하지 않음 (이중 소스 금지).
- **취소/해지 시 지급된 크레딧 회수 없음** — 원장은 불변, 단건 크레딧과 같은 원장에서 자연 합산.
- 기존 단건 결제·`consume_credit_and_create_report`·인증 로직 무변경 (확장만).

## 2. 구현 내역

| 항목 | 파일 | 내용 |
|---|---|---|
| 마이그레이션 | `supabase/migrations/20260715000001_subscriptions.sql` | `subscriptions` 테이블(RLS 본인 SELECT만) + `upsert_subscription_state` RPC(service role 전용, polar_modified_at 기반 이벤트 역순 도착 가드) |
| 체크아웃 | `src/app/api/checkout/route.ts` | plan `sub_basic` 추가 → `POLAR_SUBSCRIPTION_ID_BASIC`. 유효 구독(active/trialing/past_due) 보유 시 409로 중복 구독 차단 |
| 웹훅 | `src/app/api/webhooks/polar/route.ts` | order.paid에 sub_basic 매핑(+4, `subscription_monthly`), metadata.user_id 누락 시 subscriptions 역조회 폴백. subscription.created/updated/active/canceled/uncanceled/revoked/past_due → 상태 upsert. 알 수 없는 status는 스킵+알림(영구 재시도 루프 방지) |
| 구독 조회 API | `src/app/api/subscription/route.ts` | GET — 본인 유효 구독 1건(RLS) |
| 고객 포털 API | `src/app/api/subscription/portal/route.ts` | POST — Polar customerSessions 생성 → 포털 URL(해지·결제수단 변경은 Polar에 위임) |
| proxy | `src/proxy.ts` | 보호 prefix에 `/api/subscription` 추가 |
| 상수 | `src/constants/messages.ts` | `SUBSCRIPTION_PLAN`(4회, 월 9,900원), `CREDIT_PAYMENT.subscriptionPolicy`(해지·크레딧 유지·미사용 월 환불) |
| /checkout | `src/app/checkout/page.tsx` | 플랜 카드 3종(?plan= 프리셀렉트), 구독 중 배너(다음 갱신일·past_due 안내·해지 예약 표시·구독 관리 버튼→포털), 확인 모달 구독 분기 |
| /pricing | `src/app/pricing/page.tsx` | 월간 Basic 카드 추가(4열 반응형), 구독 정책 문구 |

## 3. 엣지 케이스 정리

- **결제 실패/연체**: order.paid 미발생 → 지급 없음. `subscription.past_due`로 상태만 기록, /checkout 배너에 결제수단 확인 안내.
- **구독 취소 후 잔여 크레딧**: 원장 무변경 — 만료 없이 유지 (UI 문구로 고지).
- **단건+구독 합산**: 같은 `credit_transactions` 원장 → `get_my_credit_balance` = SUM(delta)로 자연 합산. 차감 RPC 무변경.
- **웹훅 순서 역전**: `upsert_subscription_state`가 polar_modified_at 비교로 오래된 페이로드 무시.
- **갱신 주문의 metadata 유실**: order.subscriptionId → subscriptions 테이블 역조회 폴백.
- **재구독**: 기존 구독이 canceled/revoked면 차단 대상 아님 → 새 구독 행 생성(polar_subscription_id가 다름).

## 4. 수동 작업 (정빈님)

1. Polar 대시보드에서 **Recurring(월간) 상품** "월간 Basic" 생성 — 월 9,900원.
2. 환경변수 `POLAR_SUBSCRIPTION_ID_BASIC` 등록 (로컬 `.env.local` + Vercel).
3. Polar 웹훅 설정에서 `subscription.created / updated / active / canceled / uncanceled / revoked / past_due` 이벤트 구독 추가 (order.paid는 기존 구독 중).
4. `20260715000001_subscriptions.sql`을 Supabase SQL Editor에서 실행 (20260707000001·20260707000002 선행 필수).

## 5. 범위 제외

- CreditBalance 옆 구독 배지 — 선택 항목, /checkout 배너로 대체. 필요 시 후속.
- 연간 구독·Pro 구독 — 미기획.
