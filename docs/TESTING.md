# 테스트 가이드 (Phase 2-2J)

> 돈이 오가는 로직(크레딧 지급/차감, 웹훅 멱등성, 구독 갱신)의 회귀 방지 안전망.
> 실행: `npm run test` (감시 모드: `npm run test:watch`). CI: `.github/workflows/test.yml`.

## 원칙

- **실 서비스 호출 금지**: 모든 테스트는 실 Supabase/Polar/AirROI/Resend를 절대 호출하지 않는다.
  `tests/setup.ts`가 더미 환경변수를 강제 주입하고, 외부 의존성은 전부 모킹한다 (과금·데이터 오염 방지).
- **웹훅 서명은 실 검증 경로**: Polar 웹훅 테스트는 실제 `standardwebhooks` HMAC으로 서명한
  요청을 실제 `POST` 핸들러(서명 검증 포함)에 통과시킨다 — 서명 검증 우회 모킹 없음.
- **RPC는 2중 방어**: Postgres 안에서만 도는 RPC 로직(FOR UPDATE·PK 멱등성·stale guard)은
  Node에서 실행 불가 →
  1. **SQL 계약 테스트**(`tests/sql/`)가 마이그레이션 원문의 안전장치 구문·순서를 고정하고
  2. **에뮬레이션**(`tests/helpers/supabaseAdminMock.ts`)이 같은 의미를 재현해 호출부(라우트) 로직을 검증한다.
  - 한계: 실제 Postgres 동시성 자체는 이 테스트가 증명하지 못한다. 마이그레이션 SQL을 수정할 땐
    계약 테스트와 에뮬레이션을 함께 갱신할 것.

## 무엇이 보장되는가

| 파일 | 보장 내용 |
|------|-----------|
| `tests/webhooks/order-paid.test.ts` | 같은 `order.paid` 2번 도착 → 크레딧 1번만 지급(멱등 키 `order.paid:<order.id>`) · basic +3 / pro +10 / sub_basic +4 · `subscription_update`(비례정산) 미지급 · 갱신 주문 metadata.user_id 누락 시 subscriptions 역조회 폴백 · 상품 매핑 실패 시 200 + 지급 없음 + 운영자 알림 · **서명 검증 실패 403 + DB 접근 0회** · 지급 RPC 실패 시 re-throw(Polar 재시도) |
| `tests/webhooks/subscription-sync.test.ts` | subscription.* 7종 전부 상태 미러만 갱신, **크레딧 원장 절대 불개입**(해지 시 회수 없음 포함) · 역순 도착 이벤트가 최신 상태를 덮지 않음 · 알 수 없는 status는 스킵+알림(재시도 루프 방지) · 신규 구독 user_id 누락 시 no_user_skipped+알림 |
| `tests/credits/consume-analysis.test.ts` | 잔액 ≥1 → 정확히 -1 차감 + 리포트 생성(차감 행이 리포트 참조) · 잔액 0 → 402 + 원장 무변경 · **동시 요청 2건·잔액 1 → 1건만 성공(이중 차감 없음)** · 잔액 = SUM(delta) 불변식 · 비로그인 401/입력 오류 400 시 RPC 미호출 |
| `tests/credits/history.test.ts` | `/api/credits/history`의 balanceAfter 누적합이 시점별 SUM(delta)와 일치 · 최신순 반환 · 500행 상한 truncated 플래그 · 비로그인 401 · DB 오류 시 상세 미노출 |
| `tests/sql/rpc-contract.test.ts` | 마이그레이션 SQL 원문 고정: consume RPC의 FOR UPDATE 잠금(잔액 계산보다 선행)·INSUFFICIENT_CREDITS 가드 순서, grant RPC의 event_id 충돌 스킵 순서, 쓰기 RPC 3종+upsert의 anon/authenticated revoke, stale guard 순서, 구독 마이그레이션의 원장 불개입, delta<>0 CHECK, RLS 정책 구성 |
| `tests/consistency/reason-mapping.test.ts` | reason 6종: SQL CHECK ↔ 웹훅 PLAN_CREDITS ↔ 마이페이지 REASON_LABELS 3자 일치(매핑 누락 시 실패) · 플랜별 지급 수량 확정값(3/10/4) · KNOWN_SUB_STATUSES == subscriptions CHECK |

## 구조

```
tests/
  setup.ts                     # 더미 env 강제 주입 (실 키 차단)
  mocks/server-only.ts         # 'server-only' 패키지 no-op 대체
  helpers/polarPayloads.ts     # Polar 웹훅 페이로드 팩토리 + 실서명 (zod 스키마 통과형)
  helpers/supabaseAdminMock.ts # RPC 3종 인메모리 에뮬레이션 (SQL 의미 미러)
  webhooks/  credits/  sql/  consistency/
```

## 새 테스트를 추가할 때

- 결제·크레딧에 새 reason/plan/status를 추가하면 `reason-mapping.test.ts`가 먼저 깨진다 —
  SQL CHECK·웹훅 상수·마이페이지 매핑을 모두 갱신한 뒤 테스트 기대값을 수정할 것.
- 마이그레이션의 RPC를 바꾸면 `rpc-contract.test.ts`와 `supabaseAdminMock.ts`를 함께 갱신.
- 외부 API를 부르는 코드는 반드시 모킹 — 테스트에서 fetch가 실도메인으로 나가면 안 된다.
