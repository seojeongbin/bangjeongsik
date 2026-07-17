# 방정식 (Bangjeongsik)

> 숙박업 창업을 위한 10초 입지 스코어링 & 리스크 탐지기  
> 슬로건: "숙소 입지부터 마진 계산까지, 당신 방의 수익을 위한 단 하나의 공식"

## 기술 스택 (절대 변경 금지)

- Framework: Next.js 14 (App Router)
- Language: TypeScript strict
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL)
- Deploy: Vercel (Hobby 플랜)
- Payment: **Polar** (MOR, Phase 1-2부터) — `@polar-sh/nextjs` 사용
- Airbnb Data: **AirROI API** (pay-as-you-go, Phase 1-2부터)
- Map: 카카오맵 (`react-kakao-maps-sdk`)
- Monitoring: Sentry (Phase 1-2부터)

## 금지 사항

- Bootstrap, Material UI, CSS modules, styled-components 사용 금지
- 새 라이브러리 추가 전 반드시 확인 요청
- API 키/시크릿은 절대 코드에 하드코딩 금지 → 환경변수로만 관리
- `NEXT_PUBLIC_` 접두사는 클라이언트 노출 가능 값에만 (서버 키에 절대 금지)
- 에러 메시지에 DB 구조·서버 경로·스택트레이스를 클라이언트로 노출 금지 (Sentry에만 기록)

## 핵심 비즈니스 원칙

- **개별 숙소 노출 정책 (2026-05 변호사 상담 후 확정):**
  - 공공데이터(외도민): 상호·주소 노출 가능 (연락처·대표자 실명 제외) — 공개 인허가 정보이므로 리스크 낮음
  - AirROI 수익·예약률·객단가: **개별 숙소 특정 노출 금지** — 변호사 "영업비밀 해당 가능성, 검토 필요" 판정. 법률 검토 완료 전까지 보류
  - 에어비앤비 숙소 사진: **절대 노출 금지** — 변호사 "이의제기 분명히 들어온다, 소극적으로" 권고
  - **모든 AirROI 데이터는 반드시 통계 가공값으로만 노출**: "연희동 2룸 평균 객단가 N만원", "이 동네 상위 25% 수익 구간 N만원" 형태
  - Jason(AirROI) 허가 = 라이선스 문제 해결. 한국 영업비밀법 리스크는 별개이므로 통계 원칙 유지
- 법적/세무 결과물: 반드시 "참고용 시뮬레이션, 최종 확인은 담당자에게" 면책문구 포함
- 데이터 기준일: 모든 리포트에 수집/캐시 기준일 명시 필수
- 외도민 기준: 1군(365일) 기준 설계, 특례(180일) 보정 문구 리포트 하단 필수
- 결제 후 접근: 리포트 토큰은 **반드시 Polar 결제 완료 웹훅 수신 후** 발급 → 2026-07-07 폐기, PRD_master_reconciliation.md 참고
- 결제 안내: 결제 전 확인창 + "무엇이 열리는지/환불·복원 정책" 명시 필수
- 권한 체크: URL 숨김·로그인만으로 보안 처리 금지. report_token 검증이 핵심 → 2026-07-07 폐기, PRD_master_reconciliation.md 참고
- AirROI 비용 통제: 캐시 우선 + 일일 호출 상한 + 급증 시 알림
- **신규 기능 기획 시 필수 체크 (2026-06-21 확정)**:
  - "공유되면 무력화되는가?" — 동 단위 유료 폐기를 이끈 핵심 질문. 캡처/공유로 콘텐츠가 퍼지면 재결제 없음
  - "동 단위인가 주소 단위인가?" — 동 단위로 값을 매기는 정보는 공유 리스크 재검토 필수. 주소 기반만 재결제 구조 성립
  - "미끼에 핵심 지표를 다 줬는가?" — 무료 영역은 판단 불가능한 1개 지표까지. 예약률+객단가 조합 등 판단 가능한 조합은 반드시 유료

## 폐기된 확정사항 (2026-07-07 마스터 조정 — PRD_master_reconciliation.md)

> 아래 항목은 TOBE 비전(향후_개발단계.txt) 우선 원칙에 따라 공식 폐기됨.
> 과거 대화·코드·문서에 잔재가 있으면 무시할 것.

1. **[폐기] 9,900원 단건 리포트 무제한 판매 모델** — Free 1회 / Basic 3회
   9,900원 / Pro 10회 24,900원 횟수제 크레딧으로 대체. 결제와 리포트
   생성이 분리됨 (결제 = 크레딧 지급, 분석 실행 = 크레딧 차감).
2. **[폐기] Polar 웹훅에서 report_token 발급** — 웹훅은 크레딧 지급만
   담당. 리포트 생성은 분석 실행 시점에 크레딧 차감과 함께 발생.
3. **[폐기] report_token 단독 접근 권한 모델(신규 리포트 한정)** — 신규
   리포트는 로그인 계정(user_id) 귀속 + 소유 검증. 기존 발급 토큰의
   열람 호환은 유지.
4. **[폐기] "AirROI 좌표 exact_location:false → 맵 핀 용도 부적합, 핀은
   외도민만" 판정** — AirROI 좌표의 핀 사용 가능성 별도 확인 완료
   (2026-07). 유료 레이어에서 에어비앤비 매물 핀으로 사용한다. 좌표
   오차는 건물 특정을 막는 법적 안전장치로 재해석. 단 (a) 핀 클릭 시
   개별 숙소명·사진·개별 수익 노출 금지 원칙은 그대로 유지 (b) 핀
   좌표를 건축물대장 조회 입력으로 사용 금지 (오차 존재).
5. **[폐기] /report/[token] 별도 페이지가 유일한 리포트 뷰** — 주 경로는
   /explore 인라인 패널. 페이지는 기존 토큰 호환·재열람용으로 병행 유지.
6. **[유지 재확인 — 폐기 아님]** 외도민 = 경쟁밀도 유일 소스, AirROI
   통계 가공 노출 원칙(핀 위치만 예외), area_scores 폐기, 동 단위 유료
   없음 원칙은 모두 그대로 유효.

## 현재 Phase

**Phase 2-2J — ✅ 완료 (2026-07-17)**
결제·크레딧·구독 핵심 로직 테스트 스위트 구축. 프로덕션 로직 무변경 — 테스트·문서·CI만 추가. 가이드: `docs/TESTING.md`.
- **인프라**: Vitest 4 dev 의존성 추가(Next 16 + TS 호환 테스트 러너 — 이유: 설정 최소·esbuild 변환으로 별도 바벨 불필요), `npm run test`/`test:watch` 스크립트, `vitest.config.ts`(@ alias, `server-only` no-op 대체, `next/server` ESM 서브패스 alias + `@polar-sh/nextjs` inline 처리, Polar SDK zod 로딩 대비 hookTimeout 60s). `tests/setup.ts`가 더미 env 강제 주입 — **실 Supabase/Polar/AirROI/Resend 호출 원천 차단**.
- **모킹 전략(확정)**: 로컬 테스트 DB 대신 전면 모킹 + 2중 방어 — ① 웹훅은 실제 `standardwebhooks` HMAC 서명으로 실 `POST` 핸들러(서명 검증 포함) 통과, 페이로드는 Polar SDK zod 스키마 통과형 팩토리(`tests/helpers/polarPayloads.ts`) ② Postgres 전용 RPC 로직(FOR UPDATE·PK 멱등성·stale guard)은 SQL 계약 테스트(`tests/sql/rpc-contract.test.ts` — 마이그레이션 원문의 안전장치 구문·순서 고정)와 인메모리 에뮬레이션(`tests/helpers/supabaseAdminMock.ts` — 사용자별 뮤텍스로 직렬화 재현)의 쌍으로 커버. 한계(실 Postgres 동시성 미증명)는 TESTING.md에 명시.
- **테스트 57개 / 6파일 전부 통과**: [1] `tests/credits/consume-analysis.test.ts`(정확히 -1 차감·402 원장무변경·**동시 2요청 이중차감 방지**·SUM(delta) 불변식·401/400 시 RPC 미호출) [2] `tests/webhooks/order-paid.test.ts`(중복 order.paid 1회만 지급, basic+3/pro+10/sub_basic+4, subscription_update 미지급, metadata 누락 시 subscriptions 역조회 폴백, 매핑 실패 200+알림, **서명 위조·오시크릿 403**, RPC 실패 re-throw) [3] `tests/webhooks/subscription-sync.test.ts`(7종 이벤트 상태 미러만·**원장 절대 불개입**·역순 도착 가드·미지 status 스킵+알림) [4] `tests/credits/history.test.ts`(balanceAfter 누적합=SUM(delta)·truncated·오류 시 DB 상세 미노출) + `tests/consistency/reason-mapping.test.ts`(SQL CHECK ↔ 웹훅 PLAN_CREDITS ↔ 마이페이지 REASON_LABELS 3자 일치, KNOWN_SUB_STATUSES ↔ subscriptions CHECK 일치).
- **CI**: `.github/workflows/test.yml` — push(main)/PR/수동에서 `npm ci && npm run test`. 시크릿 불필요(더미 env).
- **발견된 버그(수정 안 함 — 별도 확인 필요)**: `/api/credits/history`가 오름차순+상한 500행이라 이력 500행 초과 사용자는 **최근 이력이 누락되고 표시 잔액이 실제와 달라짐**(오래된 500행 합계만 반환). 부수: 정확히 500행일 때 truncated=true 오탐. 발생 시점은 먼 미래(거래 500회)라 심각도 낮음.
- 검증: `npm run test` 57/57, `tsc --noEmit` 클린, ESLint 신규 파일 클린(19건 전부 선재 별건), `next build` 통과.

**Phase 2-2I — ✅ 코드 완료 (2026-07-17)**
마이페이지 신규 + 전면 디자인 리디자인(v4). 기능·API·결제·인증 로직 무변경 — 순수 UI + 신규 조회 전용 페이지/API만.
- **[A] 마이페이지**: `GET /api/credits/history` 신규(server-user + RLS `credit_transactions_select_own` 본인 행만, 오름차순 누적합으로 잔액 추이 `balanceAfter` 계산 후 최신순 반환, 상한 500행 + `truncated` 플래그. proxy `/api/credits` prefix 보호에 자동 포함). `/mypage`(`src/app/mypage/page.tsx` + `src/components/mypage/MyPageContent.tsx`) — ① 계정 요약(카카오 프로필 `user_metadata` name/avatar_url, 크레딧 잔액=history 응답 재사용, 구독 상태 + Polar 포털 버튼 — `/api/subscription`·`/api/subscription/portal` 기존 API 재사용) ② 결제·크레딧 이력 테이블(reason 한글 매핑: signup_free 가입 무료/purchase_basic·pro 구매/subscription_monthly 월간 구독 지급/consume_report 분석 사용/refund 환불) ③ 분석 리포트 이력(기존 `GET /api/analysis` 목록 → 클릭 시 `GET /api/analysis/[id]` 재열람 무차감, `ReportSections` 재사용 우측 슬라이드 오버레이 — 주소 없는 리포트는 건축물대장 안내 슬롯). 비로그인 시 카카오 로그인 카드. Navbar "마이페이지" 링크는 로그인 시에만 노출(auth state 구독 추가).
- **[B] 디자인 시스템 v4** (`docs/DESIGN.md` 전면 개정 + `globals.css @theme` 토큰 갱신): 페이지 배경 연블루 `#F0F5FF` → 뉴트럴 `#F7F8FA` + 흰색 섹션 교차 층위, 브랜드 그라데이션(135deg 블루→스카이) 전면 폐기 → 단색 `#1D4ED8`(hover `#1E40AF`, 흰 배경 대비 6.3:1 AA), 보더 `#E2EAF8`→`#E4E7EC` 뉴트럴, 카드 `rounded-[18px]`+그림자 도배 → `rounded-[12px]`+경계선 구분(그림자는 지도 오버레이·모달 등 플로팅 전용), 로고·BookIcon 그라데이션 클립 → 단색, 이모지 아이콘 제거(🔗→lucide Link2, ⚠️ 텍스트화), 숫자 `tabular-nums` 적용. **전역 hex 마이그레이션**: `#1a56db`→`#1D4ED8`, `rgba(26,86,219,…)`→`rgba(29,78,216,…)`, `#F8FAFF`/`#FAFBFF`→`#F8F9FB`, `#EEF2F9`→`#EEF0F4` (src 전체 sed — /checkout·success 등 범위 외 페이지도 색상만 자동 승계).
- 적용 범위: 랜딩(히어로 좌측 정렬 전환 + 데이터 소스 스트립, Problem/Feature/Review/ClosingCta — 닫는 CTA는 그라데이션 슬래브 → `#0F172A` 잉크 네이비 단색 블록), BuildingCheckSection·SimulatorSection(입력 폼 층위 재구성), /pricing(4카드 경계선 구분·추천만 브랜드 강조·Sparkles 제거), /explore(헤더 카피 "종합점수는 결제 후 공개"→"정밀 분석은 크레딧 1회 차감", ExploreMapView 그라데이션 버튼 5곳 단색화·글로우 제거), 리포트(SectionCard·StatChip·ProfitCalculator·차트). /checkout 레이아웃은 범위 외 유지(그라데이션→단색 정리만).
- **차트 팔레트(dataviz 검증)**: 성수기 `#1D4ED8`/비수기 `#60A5FA` CVD ΔE 21.8 통과(비수기 대비 2.48:1 WARN은 범례 칩·툴팁·직접 라벨로 relief 충족), 경쟁밀도 비교 막대 그레이 `#94A3B8`→`#667085`(대비 개선 — 강조 해제 의도라 저채도 유지), 게이지 시퀀셜 램프 `#EFF6FF→#1D4ED8` 명도 단조 확인.
- 검증: `tsc --noEmit` 통과, ESLint(신규·변경 파일 클린 — MonthlyLedger 누적 재할당·SimulatorSection URL 복원 useEffect·airbnbData 미사용 변수·`.claude/skills` 스크립트 에러는 전부 선재 별건), `next build` 통과(24페이지 + `/mypage`·`/api/credits/history` 라우트 확인), 프로덕션 스모크(미인증 `/api/credits/history` 401, `/mypage`·`/`·`/pricing` 200, 랜딩 linear-gradient 0건, /pricing tabular-nums 렌더 확인).

**Phase 2-2H — ✅ 코드 완료 (2026-07-15)**
월간 구독 — 기존 크레딧 원장 위의 레이어로 구현. 설계·해석 결정: `docs/PRD_phase2-2H_subscription.md`(§0 최상단에 스펙 해석 확정).
- **스펙 해석 확정**: "월간 Basic 자동 구독 시 월 1회 무료" = **월 9,900원 자동결제 → 매 결제 주기 크레딧 4회(Basic 3회 + 무료 1회) 지급**. 원장에 주기당 `+4` 한 행(`reason='subscription_monthly'` — 20260707000002 CHECK에 이미 예약된 값, 스키마 무변경).
- **지급 트리거 = `order.paid`만**(billingReason `subscription_create`/`subscription_cycle`): Polar가 주기마다 새 order를 만들어 order.id 기반 기존 멱등성(`grant_purchase_credits`+`webhook_events`)이 그대로 중복 지급을 차단. 결제 실패/연체(past_due) 시 order.paid 미발생 → 미지급 자동 충족. `subscription_update`(비례정산)는 지급 제외. metadata.user_id 누락 갱신 주문은 `subscriptions` 역조회 폴백.
- **`subscription.*` 웹훅 7종은 상태 미러 동기화만**: 신규 `subscriptions` 테이블(마이그레이션 `20260715000001_subscriptions.sql` — RLS 본인 SELECT만) + `upsert_subscription_state` RPC(service role 전용, `polar_modified_at` 비교로 이벤트 역순 도착 가드, 알 수 없는 status는 스킵+알림으로 영구 재시도 루프 방지). 크레딧·잔액에 절대 개입 안 함. 해지 시 지급 크레딧 회수 없음(원장 불변, 단건과 자연 합산).
- API: `/api/checkout`에 plan `sub_basic` 추가(`POLAR_SUBSCRIPTION_ID_BASIC`, 유효 구독 보유 시 409 중복 차단), `GET /api/subscription`(본인 유효 구독 조회), `POST /api/subscription/portal`(Polar customerSessions → 고객 포털 URL — 해지·결제수단 변경은 Polar 위임). proxy 보호 prefix에 `/api/subscription` 추가.
- UI: `/pricing` 월간 Basic 카드(4열 반응형, `?plan=` 프리셀렉트 링크), `/checkout` 플랜 3종 + 구독 중 배너(다음 갱신일·past_due 결제수단 안내·해지 예약 표시·구독 관리 버튼) + 확인 모달 구독 분기. `CREDIT_PAYMENT.subscriptionPolicy` 신설(해지 자유·크레딧 유지·미사용 월 24시간 환불). CreditBalance 구독 배지는 선택 항목이라 범위 제외.
- 기존 단건 결제·차감 RPC·인증 무변경(확장만). 검증: 타입체크·ESLint·빌드 통과, 스모크(미인증 /api/subscription·portal·checkout(sub) 401, 잘못된 plan 400, /pricing 구독 카드 렌더).
- **미완료(수동 작업 필요)**: (1) Polar 대시보드에 Recurring 월간 상품 "월간 Basic"(₩9,900/월) 생성, (2) `POLAR_SUBSCRIPTION_ID_BASIC` 환경변수 등록(로컬+Vercel), (3) Polar 웹훅에 subscription.* 이벤트 7종 구독 추가, (4) `20260715000001_subscriptions.sql` 마이그레이션 실행(20260707000001·000002 선행 필수).

**Phase 2-2G — ✅ 코드 완료 (2026-07-13)**
분석 진입 경로 완성 — 핀 없이도 리포트 도달 가능(airbnb_pins 0건 상태에서도 서비스 완결). 크레딧 차감 RPC·인증·결제 로직 무변경, 진입 경로 배선만.
- **분석 트리거 4종 통일**(`ExploreMapView.tsx`): `AnalysisTarget`(lat/lng/address/label/source) 단일 모델 + `selectTarget()` 공통 진입 — (a) **지도 임의 지점 클릭**(`Map onClick` → `mouseEvent.latLng`, 핵심 경로), (b) **주소 검색**(상단 `AddressSearchBar`, 카카오 JS SDK `services.Geocoder` — `useKakaoLoader` libraries에 `services` 추가, 서버 API 신설 없음), (c) **외도민 핀** 인포버블에 "이 위치 분석하기" 버튼, (d) 에어비앤비 핀(기존 유지). 구 `selectedPin` 상태 제거.
- **address 전달 원칙**: 주소 검색·외도민 핀(공공데이터 주소)만 `POST /api/analysis`에 address 전달 → 건축물대장 자동 조회. 지도 클릭·에어비앤비 핀은 null(핀 좌표 오차 — §1.D 준수, 패널 내 주소 직접 입력 폴백 기존 유지).
- **반경 UX**: 어느 트리거든 동일 `RadiusControl`(프리셋 스냅핑 유지 — 캐시 히트율) + Circle + **십자선 마커**(선택 지점 표시). `key={lat,lng}`로 대상 변경 시 확인 단계 리셋.
- **크레딧 상태별 분기**: 대상 선택 시 `GET /api/credits/balance` 조회 → `checking`(확인 중)/`unauthed`(카카오 로그인 카드 — `PinLoginCard` message/bare prop으로 재사용)/`zero`(크레딧 없음 + /checkout·/pricing 유도)/`ready`. **실수 차감 방지 2단 확인**: "이 위치 분석하기 (크레딧 1회 차감)" → "크레딧 1개를 사용해 … 실행할까요? [취소][차감하고 분석 실행]". 조회 실패 시 진행 허용(서버 RPC가 최종 게이트), 402 INSUFFICIENT_CREDITS 처리 유지.
- **내 분석 기록**(재방문 동선): `GET /api/analysis` 신규(server-user+RLS 본인 행만, 최근 100건) + `MyReportsPanel.tsx`(지도 우측 토글 스택 "내 분석 기록" 버튼 → 목록 → 클릭 시 `GET /api/analysis/[id]` 재열람, **차감 없음**). 비로그인 401 → 로그인 카드.
- **/report(토큰 없음)**: `src/app/report/page.tsx` 신규 — `/explore`로 redirect(307 확인). 소유자 재열람 무차감·비소유 404는 기존 동작 유지.
- **카카오 로그인 헬퍼 추출**: `src/lib/kakaoSignIn.ts`(KOE205 스코프 주의 포함) — PinLoginCard·MyReportsPanel 공용(AuthButton은 범위 밖이라 미변경).
- 검증: 타입체크·ESLint·빌드 통과, 스모크(/report 307, 미인증 /api/analysis 401). **지도 UI는 카카오 SDK 로딩 후 클라이언트 렌더라 SSR 검증 불가 — 실 브라우저 E2E는 기존 2-2A/B/C 수동 작업 완료 후 가능.**

**Phase 2-2F — ✅ 코드 완료 (2026-07-12)**
리포트 품질 전면 개편 — 시각화 + 수익성 계산기 재설계. AirROI 추가 호출 없이 기존 `/calculator/estimate` 응답 필드만 활용.
- **recharts 신규 의존성 추가** (사용자 지정 차트 라이브러리, 계절성 차트에 사용).
- **AirROI 파싱 확장**(`src/lib/data/airbnbData.ts`): 버려지던 `percentiles`의 revenue/adr/occupancy p25·p50·p75·p90을 `AirbnbAreaStats.revenuePercentiles`/`adrPercentiles`/`occupancyPercentiles`(optional)로 보존. **구 캐시(90일)에는 없으므로 UI는 revenueP25/P75 구간 칩으로 폴백** — 캐시 만료 후 자연 갱신, 강제 재호출 없음.
- **계절성 파생 단일 소스** `src/lib/report/seasonality.ts`: `deriveSeasonality`(12개월 분포→월별 매출·연평균선·성수기/비수기 자동 분류 — 개월수 하드코딩 금지, 균등 분포는 uniform 처리)와 `estimateTopPercent`(분포 내 위치 선형 보간, 비단조 분포 null). 차트 표시값 = 계산기 기본값.
- **신규 컴포넌트 4종**(`src/components/report/`): `SeasonalityChart`(recharts 막대 + 연평균 기준선, 성수기 `#1a56db`/비수기 `#60A5FA` — dataviz 팔레트 검증 통과), `RevenuePositionGauge`(시퀀셜 블루 램프 트랙 + "상위 약 N% 수준" 해석), `CompetitionCompareChart`(반경 밀도 vs 마포구 평균 vs 최고 동 — `data/seoul-mapo-dong-minbak-count.json`+`-area.json` 정적 계산, API 호출 없음), `ProfitCalculator`(구 `ReportSimulator` 대체·삭제 — 성수기/비수기 매출·개월수 실데이터 기본값+전 항목 수정 가능, **월세 상한선 = (평균 월매출−월세 외 지출)×0.7** 핵심 지표, 회수기간은 보증금 제외 셋업비 기준, 한 줄 결론 "월세 N만원 이하면 해볼 만").
- **ReportSections 클라이언트 전환 + 상태 리프트**: `BedroomSelector`를 컨트롤 전용으로 개편(`onStatsChange`/`onLoadingChange` 콜백), 스펙 변경 시 통계 칩·게이지·계절성 차트·계산기 기본값이 함께 갱신(계산기는 사용자가 손대지 않은 필드만 동기화 — dirty 추적). `AnalysisPanel`에서 `key={reportToken}`으로 분석 전환 시 상태 리셋. `/report/[token]`·`/explore` 패널 양쪽 자동 반영.
- 법적 원칙 유지: 집계 통계값만 노출, 면책문구 유지·보강("담당 관청" 문구 포함), "추정치" 배지 섹션 표시.
- 검증: 타입체크·ESLint·빌드 통과, 계절성/백분위 로직 스크립트 테스트, 임시 프리뷰 라우트 SSR 스모크(계산값 일치 확인) 후 삭제.

**Phase 2-2C — 🔨 진행 중 (착수 2026-07-09)**
에어비앤비 매물 핀 데이터 적재. 설계: `docs/PRD_master_reconciliation.md` §1.D, §3 Step 2-2C.
- 코드 구현 완료(2026-07-09): 마이그레이션 `supabase/migrations/20260709000001_airbnb_pins.sql` — `airbnb_pins`(listing_key=sha256(listing_id) 익명 키 PK, lat/lng, dong, bedrooms, room_type, exact_location, fetched_at). **화이트리스트 원칙을 스키마 주석으로 명문화 — 숙소명·사진·개별 수익 컬럼은 만들지 않는 것으로 원천 차단.** RLS 활성화 + policy 없음(service role 전용).
- 적재 스크립트 `npm run fetch:airbnb-pins`(`scripts/fetch-airbnb-pins.ts`) — **2026-07-12 폴리곤 전환 + 비용 안전장치 전면 개편**: AirROI `POST /listings/search/polygon`(요청 `polygon: [{latitude, longitude}]` 닫힌 링 3~1000정점, 응답 최상위 `pagination.total_count` + `results` — 공식 문서 확정). 검색 영역은 행정동 GeoJSON — `--dong=`이면 해당 동 폴리곤, 미지정 시 16개 동 dissolve 병합(공유 변 소거 → 단일 링 151정점, 면적 합 일치 검증 내장 — 반경 검색의 구 외 17% 혼입 문제 해소). **비용 실측: 호출당 $0.50, page_size 하드캡 10 → 비용 = ceil(매물수÷10)×$0.50 (마포 전역 8,812건 ≈ $441)**. 안전장치 4종: (1) `--count-only` — 호출 정확히 1회($0.50)로 total_count·필요 페이지·예상 비용 견적만 출력, (2) 비용 확인 게이트 — `--yes` 없으면 견적 출력 후 중단, (3) 조용한 절단 제거 — 상한(`--limit=`, 기본 100페이지=$50) 초과 시 시작 전 대형 "부분 수집" 경고 + stale 정리 스킵 + **종료 코드 2**(절단을 "완료"로 표기하지 않음), (4) `--resume` — 페이지 단위 upsert + 진행 상태 파일(`scripts/.fetch-airbnb-pins.state.json`, gitignore)로 중단 지점 재개(기준일 유지). stale 정리는 전량 수집 완료 시에만 `neq(fetched_at, 기준일)` — 반경 시절 절단 적재분(서교동 423건)도 재적재 시 교체됨.
- 조회 API `/api/map/airbnb-pins`: 로그인 + **크레딧 이력 1회 이상**(잔액 아님 — 잔액 0이어도 핀 유지, 재구매 동선 보존) 검증 후 익명 키·좌표·침실수만 반환. PostgREST 1000행 제한은 range 루프로 수집.
- **미완료(수동 작업 필요)**: (1) `20260709000001_airbnb_pins.sql` 마이그레이션 실행, (2) `npm run fetch:airbnb-pins -- --count-only`로 견적 확인($0.50) → 비용 승인 후 `-- --limit=N --yes`로 실제 적재(AirROI 실과금 — 사용자 확인 필요 원칙에 따라 미실행). 마포 전역 전량은 약 $441 — 예산 결정 필요.

**Phase 2-2D — 🔨 진행 중 (착수 2026-07-09)**
/explore 인라인 리포트(핀 클릭 + 반경 + 패널). 설계: `docs/PRD_master_reconciliation.md` §1.B, §3 Step 2-2D.
- 코드 구현 완료(2026-07-09):
  - **섹션 추출**: `/report/[token]/page.tsx`의 섹션 UI(경쟁밀도·건축물대장·AirROI 통계·BedroomSelector·시뮬레이터·면책문구)를 `src/components/report/ReportSections.tsx`로 추출(프레젠테이션 전용, 서버/클라이언트 양쪽 렌더 가능). 페이지는 얇은 래퍼로 유지(기존 토큰 URL 호환 — 폐기 아님). `buildingSlot` prop으로 건축물대장 섹션 교체 가능.
  - **API**: `POST /api/analysis`(로그인 → 입력 검증(반경 프리셋 100/250/500/1000/2000m, bedrooms 1~4, baths 1~3 0.5단위, guests≥bedrooms) → `consume_credit_and_create_report` RPC 원자 차감 → 데이터 조립 반환. 잔액 부족 402 + `INSUFFICIENT_CREDITS` 코드), `GET /api/analysis/[id]`(재열람 차감 없음, server-user+RLS 소유 검증 — 비소유자 404). 조립은 `src/lib/data/analysisData.ts` 공유(부분 실패 허용 allSettled, 경쟁밀도 반경은 사용자 선택값 사용). 공유 타입 `src/types/analysis.ts`.
  - **bedrooms-estimate 확장**: `/api/report/[token]/bedrooms-estimate`가 구 `report_purchases`(토큰 단독) 외에 신규 `analysis_reports` 토큰도 수용(server-user+RLS 소유 검증) — BedroomSelector를 인라인 패널에서 그대로 재사용.
  - **/explore 흐름**: 에어비앤비 핀 토글(미로그인 시 인라인 카카오 로그인 카드, 403/오류 안내) → MarkerClusterer(`useKakaoLoader` libraries에 `clusterer` 추가, 줌 레벨 4+ 클러스터링, 로즈 도트 마커) → 핀 클릭 → 반경 프리셋 칩 + Circle 오버레이 + 보유 크레딧 표시 → [이 위치 분석하기](크레딧 1개 차감 고지) → `AnalysisPanel`(데스크톱 우측 사이드 패널 / 모바일 풀스크린) 인라인 리포트. 402 시 `/checkout` 충전 링크.
  - **핀 경로 건축물대장**: 핀 좌표는 조회 입력 사용 금지(§1.D) — 패널 내 주소 직접 입력(`PinBuildingSection`) → 기존 `/api/building` 재사용. 역지오코딩 프리필은 미구현(카카오 REST 추가 호출 — 필요 시 후속).
  - 빌드·타입체크·ESLint·스모크 테스트(미로그인 401 게이트, 구토큰 404) 통과.
- **미완료**: 2-2A/2-2B 수동 작업(마이그레이션 2건 — `analysis_reports`는 20260707000002에 포함) + 2-2C 수동 작업 완료 전까지 로그인 실 E2E(핀 클릭→차감→패널) 검증 불가.

**Phase 2-2E — ✅ 코드 완료 (2026-07-12)**
웹 구조 개편 — 랜딩 TOBE 전환. 설계: `docs/PRD_master_reconciliation.md` §3 Step 2-2E.
- **Navbar 개편**(`src/components/layout/Navbar.tsx`): 좌측 로고(→ `/` Link) + 메뉴 [홈 `/` / 분석하기 `/explore` / 가격 `/pricing`](usePathname 활성 표시), 우측 기존 CreditBalance+AuthButton 유지. 구 인용문구 제거, 부제는 md+ 표시. '행사소식' 메뉴는 콘텐츠 부재로 범위 제외.
- **랜딩 본문 교체**(`src/app/page.tsx` → 신규 `src/components/landing/` 5종): `LandingHero`(슬로건 + 중앙 [무료로 분석하기]→`/explore` + 요금제 보기), `ProblemSection`(기존 방식 asis vs 방정식 tobe 비교 카드), `FeatureSection`(외도민 경쟁밀도 무료 / 에어비앤비 매물 분석 / 수익 시뮬레이션 — 통계 가공값·기준일 안내 문구 포함), `ReviewSection`(3×2 "후기 준비 중" 플레이스홀더만 — **가짜 후기 금지, 표시광고법 리스크로 실후기 확보 전까지 더미 텍스트 넣지 말 것**), `ClosingCtaSection`(하단 그라데이션 CTA).
- **무료 체험 재배치(2026-07-12)**: `BuildingCheckSection`(건축물대장 무료 조회)·`SimulatorSection`(수익 계산기)은 FeatureSection 아래에 그대로 재배치 — 로직 재사용, "무료 체험" 배지 추가, 하단 CTA를 구 이메일수집(`EmailCTA`)에서 "더 정밀한 분석은? → 무료로 분석하기"(`/explore` 링크)로 교체. `CompetitionSection`은 `/explore` 지도가 이미 무료·비로그인으로 동일 기능(경쟁밀도)을 대체하고 있어 삭제. `FeaturePreviewSection`·`ComingSoonSection`(구 "출시 예정" 섹션)도 신규 랜딩이 대체해 삭제. **주의**: `CompetitionSection.tsx` 삭제로 그 파일에 있던 `window.daum` 전역 타입 선언 + 다음 우편번호 스크립트 로더가 함께 사라져 `BuildingCheckSection`이 깨졌던 것을 발견 — 둘 다 `BuildingCheckSection.tsx`로 이관해 수정. `EmailCTA.tsx`(공용 컴포넌트)는 사용처가 모두 사라져 고아 상태이나 삭제 요청 범위 밖이라 파일은 남겨둠(재사용 여부 별도 결정 필요).
- **웨이트리스트 처리(2026-07-12)**: `HeroSection.tsx`(이메일 수집 폼 UI)는 랜딩에서 제거·삭제. **`src/app/api/waitlist/route.ts`와 Supabase `waitlist` 테이블은 보존** — 기존 수집 이메일은 초기 마케팅 자산이며, 향후 서울 전역 확장 등 "지역 확장 알림" 신청 용도로 재활용 예정. API·테이블·기존 데이터에 어떤 변경도 가하지 않음.
- **`/pricing` 신규**(`src/app/pricing/page.tsx`): Free(계정당 1회, CTA→`/explore`) / Basic 3회 9,900원 / Pro 10회 24,900원(추천 배지) — Basic·Pro CTA는 기존 `/checkout` 연결(신규 결제 로직 없음, `CREDIT_PLANS`/`CREDIT_PAYMENT` 상수 재사용). 월간 구독은 미구현으로 범위 제외(2-2G).
- 기존 `/explore`·`/checkout`·인증·크레딧 로직 무변경. 빌드·타입체크·ESLint 통과(단, `SimulatorSection.tsx`의 URL 파라미터 복원 `useEffect` 린트 에러 1건은 이번 수정과 무관한 기존 코드 — 별건).

**Phase 2-2B — 🔨 진행 중 (착수 2026-07-07)**
크레딧 원장 + Polar 상품 개편. 설계: `docs/PRD_master_reconciliation.md` §1.A, §3 Step 2-2B.
- 코드 구현 완료(2026-07-08): 마이그레이션 `supabase/migrations/20260707000002_credits_ledger.sql` — `credit_transactions`(원장, 잔액=SUM(delta)), `webhook_events`(event_id PK 멱등성 + checkout_id 폴링용), `analysis_reports`(2-2D 스키마 선행 생성 — 차감 RPC가 리포트 생성과 단일 트랜잭션으로 묶기 위해 의존), RPC 4종: `grant_free_credit`(가입 Free 1회, profiles 행잠금 멱등), `grant_purchase_credits`(웹훅 지급, 이벤트 중복 시 스킵), `consume_credit_and_create_report`(profiles FOR UPDATE 직렬화 → 잔액검사 → 리포트 생성 → -1 차감 원자 처리), `get_my_credit_balance`(invoker+RLS). 쓰기 RPC 3종은 anon/authenticated EXECUTE revoke — service role 전용.
- API: `/api/checkout` 개편(plan basic/pro 선택형, 로그인 필수, metadata에 user_id — 주소 지오코딩 제거), `/api/webhooks/polar` 개편(order.paid → productId 매핑 → 크레딧 지급, report_token 발급 제거, 매핑 실패는 알림만/RPC 실패는 re-throw로 Polar 재시도), `/api/credits/balance` 신규(잔액 조회), `/auth/callback`에 `grant_free_credit` 훅 연결(실패해도 로그인 진행, 다음 로그인 재시도), `/api/checkout/status`를 webhook_events 기반 `{paid}` 응답으로 전환.
- 프론트: `/checkout` 페이지를 주소 입력형 → 크레딧 플랜 선택형으로 전면 개편(비로그인 시 구매 차단 + AuthButton 안내), `/checkout/success`는 크레딧 지급 확인 + 잔액 표시로 전환, `SuccessPoller`는 지급 확인 폴링으로 전환. `ReportLockScreen.tsx` 삭제(폐기된 단건 결제 UI, 사용처 없음). `CREDIT_PLANS`/`CREDIT_PAYMENT` 상수 신설. proxy 보호 prefix에 `/api/credits` 추가. 빌드·타입체크·ESLint 통과 확인.
- **미완료(수동 작업 필요)**: (1) Polar 대시보드에 Basic(9,900원)/Pro(24,900원) 상품 2종 생성, (2) 환경변수 `POLAR_PRODUCT_ID_BASIC`/`POLAR_PRODUCT_ID_PRO` 등록(로컬+Vercel — 기존 `POLAR_PRODUCT_ID`는 신규 코드에서 미사용), (3) `20260707000002_credits_ledger.sql` 마이그레이션 실행(20260707000001 선행 필수, 사용자 확인 필요 원칙에 따라 미실행), (4) 크레딧 환불 문구(`CREDIT_PAYMENT.refundPolicy` — 미사용 시 24시간 내 전액 환불) 정책 검토.
- 월간 구독은 범위 제외 — Step 2-2G 후순위. 크레딧 차감 호출부(`POST /api/analysis`)는 Step 2-2D에서 구현.

**2026-07-09 결정**: 구글 로그인 제외, 카카오 단독 운영. 재추가 시 Supabase Dashboard Provider 활성화 + Google Cloud Console 앱 등록만 하면 되는 구조는 유지(앱 코드·env에 Google 관련 값 없음 — Dashboard 전용 설정이라 코드 변경 없이 재추가 가능).

**2026-07-11 외도민 개별 핀 레이어 /explore 이식 완료**: `docs/외도민핀_이식참고.md` 백업 스니펫 기반 신규 구현. (1) `GET /api/map/minbak-pins` — 게이트 없는 무료 API(공공데이터 인허가 — 상호·주소·좌표만, 수익 통계 절대 미포함), 마포구+`영업/정상`+좌표 보유 1,672건, PostgREST 1000행 제한 range 루프, **구 `/api/map/listings`의 `.eq('status', '영업')` 0건 버그를 `'영업/정상'` 정확 매칭으로 교정**(DB 실측 status 값은 `'영업/정상'` 단일값 5,756건 확인). (2) `/explore` 레이어 토글 — [외도민 숙소(블루, 기본 ON, 누구나)] [에어비앤비 매물(로즈, 크레딧 이력자 전용 — 기존 2-2D 게이트 유지)] 독립 토글, 두 레이어 공존. 외도민은 블루 도트 마커+블루 클러스터(calculator [10,100,500] 4구간), 에어비앤비는 로즈 도트+기본 클러스터로 시각 구분. 핀 클릭 시 상호·주소·기준일만 표시하는 인포버블(CustomOverlayMap). 동 단위 집계(DongPin·폴리곤·DongPanel)는 변경 없이 유지 — 개별 핀은 추가 레이어. 빌드·타입체크 통과, 변경 파일 ESLint 클린(기존 파일 선재 린트 에러 21건은 별건), API 스모크 테스트(비로그인 200, 1,672건) 통과.

**2026-07-11 Navbar·`/explore` 상시 크레딧 잔액 표시 추가**: `src/components/layout/CreditBalance.tsx` 신규(로그인 상태일 때만 `GET /api/credits/balance` 조회해 "보유 크레딧 N회" 표시, 비로그인 시 렌더링 안 함) — `Navbar.tsx`(랜딩)와 `explore/page.tsx` 헤더 양쪽에 배치. 컴포넌트 트리가 다른 `/explore` 분석 실행(`ExploreMapView.tsx`의 `runAnalysis`·`refreshBalance`·`handleDongCta`)이 잔액을 바꾼 뒤 Navbar/헤더 쪽 잔액도 즉시 갱신되도록 `src/lib/creditsEvent.ts`(`notifyCreditsChanged`, `window` CustomEvent 기반 — 전역 상태 라이브러리 신규 도입 없이 최소 구현)로 연동. 결제 완료(`/checkout/success`)는 기존에도 전체 페이지 리로드/이동이라 자동으로 최신값 반영 — 별도 연동 불필요. 빌드·타입체크·ESLint 통과.

**2026-07-11 동 패널 CTA 잔액 우선 확인으로 수정**: 클릭 시 무조건 `/checkout`으로 보내던 구 Phase 2-1 잔재를 수정. `GET /api/credits/balance` 먼저 조회 → 잔액>0이면 결제 없이 지도를 해당 동 중심으로 이동(`isPanto`, level 4)시키고 "매물 핀을 클릭해 분석해보세요" 토스트 표시(4초 자동 소멸). 비로그인(401)·잔액 0·조회 실패는 기존과 동일하게 `/checkout?dong=` 이동(dong은 여전히 표시 전용). `DongPanel`의 결제 이동 로직을 부모(`ExploreMapView`)의 `handleDongCta`로 이관 — 잔액 조회 중엔 버튼에 로딩 스피너 표시. 빌드·타입체크·ESLint 통과.

**2026-07-10 /map 제거**: `/explore` 감사 중 발견된 링크 안 된 Phase 1-2 고아 라우트(`src/app/map/page.tsx`, `src/components/map/MapView.tsx`·`MapClientWrapper.tsx`, `src/app/api/map/listings/route.ts`) 삭제. `/api/map/listings`는 `.eq('status', '영업')` 필터가 실제 DB 값(`'영업/정상'`)과 불일치해 항상 0건을 반환하는 버그가 있었음(죽어있던 코드라 실사용 영향 없음). 삭제된 개별 외도민 마커 렌더링 패턴(`MarkerClusterer`+`MapMarker`, 데이터 조회 쿼리)은 `docs/외도민핀_이식참고.md`에 스니펫 백업 — **외도민 개별핀은 추후 `/explore`로 이식 예정 → 2026-07-11 이식 완료**. `src/app/api/map/area-stats/route.ts`는 이번에 함께 삭제하지 않음 — `MapView.tsx` 삭제로 유일한 호출부가 사라져 신규 고아 상태가 됐으나 이번 요청 범위 밖이라 별도 확인 후 처리.

**Phase 2-2A — 🔨 진행 중 (착수 2026-07-07)**
Supabase Auth 도입(카카오 단독, 구글 보류 — 2026-07-09 결정). 설계: `docs/PRD_phase2-2A_auth.md`. 상위 로드맵: `docs/PRD_master_reconciliation.md` §3 Step 2-2A.
- 코드 구현 완료(2026-07-07): `profiles` 마이그레이션(`supabase/migrations/20260707000001_profiles_auth.sql`), `src/lib/supabase/browser.ts`·`server-user.ts`(`@supabase/ssr` 신규 도입), `src/proxy.ts`(Next.js 16 미들웨어 후속 규약 — 세션 갱신 전역 + `/api/map/airbnb-pins`·`/api/analysis` prefix 보호 게이트 선등록), `src/app/auth/callback/route.ts`(OAuth code→세션 교환), `AuthButton`(Navbar 로그인/로그아웃 UI). 빌드·타입체크 통과 확인.
- **미완료(수동 작업 필요)**: (1) Supabase Dashboard에서 Kakao Provider 활성화 + Redirect URL 등록(Google은 2026-07-09 결정으로 보류), (2) 카카오 개발자 콘솔 OAuth 앱 등록, (3) `20260707000001_profiles_auth.sql` 마이그레이션을 실제 Supabase 프로젝트에 실행(DB 마이그레이션 실행은 사용자 확인 필요 원칙에 따라 미실행) — 이 3가지 완료 전까지 실제 로그인 동작 검증 불가.
- Free 크레딧 지급 로직: Step 2-2B에서 구현 완료 (`/auth/callback` → `grant_free_credit` RPC).

**Phase 2-1 — ✅ 완료 (2026-06-27)**
지도 기반 입지 탐색 — `/explore` 페이지, 마포구 16개 동 동핀, 외도민 경쟁밀도 무료 표시 + **주소 리포트로 가는 깔때기** (2026-06-21 전략 전환: 동 단위 유료 결제 폐기).
- Step 1~3 완료: 지도·동핀·패널·무료 경쟁밀도·블러 잠금 UI (동 패널 별점·종합점수 섹션 제거됨)
- Step A(현재 결과물 배포): 착수 가능
- Step B(동 CTA → 주소 입력 → 기존 checkout 연결): ✅ 완료 (2026-06-21) — `/checkout?dong=` query string 전달, 신규 결제 로직 없음, 기존 checkout 재사용. CTA 문구 "정밀 분석 보기" → "주소 입력하고 정밀 분석받기"로 변경
- Step C(동 무료에 AirROI 예약률 1지표 — 사전 캐시 방식): ✅ 완료 (2026-06-21) — 외도민 개수+경쟁밀도만 무료 노출로 확정. AirROI `/calculator/estimate`는 동 단위가 아닌 마포구 광역 comparable로 스무딩되어 변별력 없음 확인(외도민 0개 동 vs 307개 동이 8pp 차이). 지표 제외 결정, 추후 다른 엔드포인트/데이터소스로 재시도 가능성 열어둠.
- Step D-1(동 경계선 표시): ✅ 완료 (2026-06-22) — 16개 동 GeoJSON 폴리곤 렌더링, 4색 저채도 파스텔 팔레트(인접 동끼리 다른 색), 호버/선택 시 강조, 핀 호버도 연동. 핀 중심 좌표를 점단순평균 → 면적가중 centroid로 재계산(extract-mapo-dong.mjs 수정)
- Step D-2(줌아웃 시 외도민 개수 상시표시 + 면적당 밀도 재산정): ✅ 완료 (2026-06-27) — 동별 면적(shoelace formula, 오차 0.6%) + 외도민 개수 사전캐시(`get_nearby_minbak` RPC, radius 500m) → 면적당 밀도(개/㎢) 산정. 임계값은 고정 숫자가 아닌 33/66 percentile 동적 계산(`data/seoul-mapo-dong-density-thresholds.json`, `npm run fetch:minbak-count` 재실행 시 자동 갱신). 동 경계 폴리곤 색을 동 구분(4색)에서 경쟁등급 표시(3색+회색)로 전환 — 핀 색상 배지는 제거(폴리곤이 그 역할 흡수), 핀은 동 이름만. 우측하단 범례 추가.
- Step D-3(PC 호버): D-1에서 선반영 완료 — 별도 작업 불필요
- Step E-1(airroi_cache 캐시 키 확장): ✅ 완료 (2026-06-27) — bedrooms, baths, guests 컬럼 추가(기존 5건 전부 2/1/4로 백필), 인덱스를 (lat,lng,radius_m,bedrooms,baths,guests)로 교체. getAirbnbData 시그니처에 세 파라미터 필수화(기본값 없음 — 호출부 누락 방지). 호출부 2곳(report/[token]/page.tsx, api/map/area-stats/route.ts) 모두 현재는 고정값(2/1/4) 유지 — 사용자 선택 UI는 Step E-3/E-4에서 추가.
- Step E-2(리포트 페이지 베드룸 선택 UI): ✅ 완료 (2026-06-27) — 신규 API `/api/report/[token]/bedrooms-estimate` (토큰검증+입력검증, bedrooms 1~4/baths 1~3 0.5단위/guests≥bedrooms), BedroomSelector 클라이언트 컴포넌트(베드룸 클릭 즉시 1회 호출, baths/guests는 "적용" 버튼 클릭 시에만 호출). 최초 진입은 서버에서 이미 조회한 기존값(2/1/4) 그대로 사용, 추가 호출 없음. 베드룸을 줄였을 때 기존 guests가 새 범위와 안 맞아도 자동조정 안 함 — 사용자가 직접 재선택하는 게 의도된 동작.
- Step E-2 디자인 보완: ✅ 완료 (2026-06-27) — 베드룸 변경 시 스피너 오버레이(Loader2) + pointer-events-none, reqIdRef로 레이스 컨디션 방지(연타 시 마지막 요청만 반영).
- **Phase 2-1 Step E 종료** (2026-06-27): E-1(캐시 키 확장), E-2(베드룸 선택 UI+단일조회)까지 완료. E-3/E-4는 E-2 구현에 통합됨. E-5(다른 베드룸 비교해보기)는 비용 대비 가치 불충분 판단으로 철회, 기능 추가 안 함. PRD_phase2-1_StepE.md 참고.
- **Phase 2-1 전체 완료** (2026-06-27): Step A~D(동 무료 미끼 → 주소 결제 깔때기 + 지도 UX) + Step E(베드룸별 수익 데이터) 모두 종료.
- 구버전 Step 5(area 결제)/Step 6(area 캐시) **폐기** — `area_scores` 테이블·`report_type='area'` 만들지 않음
PRD 문서: `docs/PRD_phase2-1.md` 참고 (v2 개정판)

**Phase 1-2 — 완료 (2026-06-11)**
AirROI 데이터 + Polar 결제 + 지도 시각화로 9,900원 단건 리포트 판매 구현 완료. → 2026-07-07 폐기, PRD_master_reconciliation.md 참고
목표: 유료 전환 10건 확인.
PRD 문서: `docs/PRD_phase1-2.md` 참고

**Phase 1-1 — 완료 (2026-05)**
건축물대장(세움터)/경쟁밀도/시뮬레이터 1군·특례 토글/카카오 공유 구현·배포 완료.
PRD 문서: `docs/PRD_phase1-1.md` 참고

**Phase 0 — 완료 (2026-03-29)**
랜딩페이지 & 수익 시뮬레이터 개발·배포 완료. 이메일 50명 달성.
PRD 문서: `docs/PRD_phase0.md` 참고

### Phase 0 구현 완료 목록

| 컴포넌트 | 파일 경로 | 설명 |
|----------|-----------|------|
| Navbar | `src/components/layout/Navbar.tsx` | f(방)정식 로고 + BookIcon |
| HeroSection | `src/components/layout/HeroSection.tsx` | 이메일 웨이트리스트 폼 → Supabase 저장 |
| SimulatorSection | `src/components/simulator/SimulatorSection.tsx` | 6개 입력 기반 수익성 계산기 |
| ResultCards | `src/components/simulator/ResultCards.tsx` | 월매출 / 순수익 / ROI / 원금회수기간 카드 |
| MonthlyLedger | `src/components/simulator/MonthlyLedger.tsx` | 12개월 창업 가계부 미리보기 |
| ComingSoonSection | `src/components/layout/ComingSoonSection.tsx` | 출시 예정 기능 섹션 |
| API: /api/waitlist | `src/app/api/waitlist/route.ts` | 이메일 수집 → Supabase `waitlist` 저장 |

### Phase 1-1 구현 완료 목록

| 기능 | 설명 |
|------|------|
| 페이지 레이아웃 재배치 | 섹션별 이메일 CTA 3곳 |
| 건축물대장 조회 (세움터) | 주소 → 외도민 등록 가능성 뱃지 |
| 시뮬레이터 운영유형 토글 | 1군(365일)/특례(180일) 분기 계산 |
| 경쟁밀도 수치화 | `minbak_listings` → 반경 500m 내 N개 |
| 카카오 공유 | 결과 공유 + 입력값 URL 복원 |

### Phase 1-2 구현 완료 목록

| 기능 | 파일 경로 | 설명 |
|------|-----------|------|
| AirROI 데이터 레이어 | `src/lib/airbnbData.ts` | AirROI API 호출 + 90일 캐시 + 일일 호출 상한(비용캡) |
| Polar 결제 — Checkout | `src/app/api/checkout/route.ts` | 주소→좌표 변환 후 Polar Checkout 세션 생성 |
| Polar 결제 — 웹훅 | `src/app/api/webhooks/polar/route.ts` | 결제 완료 이벤트 수신 → report_token 발급 (→ 2026-07-07 폐기, PRD_master_reconciliation.md 참고) |
| 리포트 페이지 | `src/app/report/[token]/page.tsx` | report_token 검증 후 AirROI 통계 리포트 렌더링 (→ 2026-07-07 폐기, PRD_master_reconciliation.md 참고) |
| 지도 시각화 | `src/components/report/ReportMap.tsx` | 카카오맵 + 경쟁 숙소 마커 |
| Sentry/Resend 모니터링 | `src/lib/monitoring.ts` | 에러 추적(Sentry) + 결제 완료 이메일(Resend) |

### Supabase 클라이언트 구분

| 파일 | 키 | RLS | 용도 |
|------|----|----|------|
| `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 적용 | (기존, Phase 0~1) 로그인 상태 무관 공개 읽기 전용 브라우저 클라이언트 |
| `src/lib/supabase/server.ts` → `supabaseAdmin` | `SUPABASE_SERVICE_ROLE_KEY` | **우회** | 특권 쓰기 전용: 웹훅, 크레딧 지급/차감, 백필 등 |
| `src/lib/supabase/browser.ts` (Phase 2-2A 신설) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 적용 | `@supabase/ssr` 브라우저 클라이언트 — 로그인 상태 인지 클라이언트 컴포넌트(로그인 버튼·세션 훅) |
| `src/lib/supabase/server-user.ts` (Phase 2-2A 신설) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + 쿠키 세션 | 적용(사용자로서) | `@supabase/ssr` 서버 클라이언트 — Server Component·보호 Route Handler에서 "현재 로그인 사용자"로 쿼리(RLS가 소유 검증) |

- **특권 쓰기**(크레딧 지급/차감, 웹훅, 백필) → 반드시 `supabaseAdmin`(`server.ts`)
- **사용자 소유 데이터 읽기/쓰기**(내 리포트, 내 잔액 등) → `server-user.ts` — RLS가 최종 방어선
- `SUPABASE_SERVICE_ROLE_KEY`에 절대 `NEXT_PUBLIC_` 금지
- 세션 갱신은 `src/proxy.ts`(Next.js 16 미들웨어 후속 규약, 구 `middleware.ts`)가 전역 담당 — 설계: `docs/PRD_phase2-2A_auth.md`

### Phase 1-2 신규 테이블

| 테이블 | 용도 |
|--------|------|
| `airroi_cache` | AirROI 응답 캐시 (90일, 비용 절감) |
| `report_purchases` | 결제 내역 + report_token |
| `airroi_usage` | AirROI 호출 모니터링 |
| `minbak_listings` | (기존) 외도민 공공데이터, 서울 |

### Phase 2-2 신규 테이블 (마이그레이션 20260707000001·20260707000002)

| 테이블 | 용도 |
|--------|------|
| `profiles` | auth.users 1:1 확장 + `free_credit_granted` 플래그 (2-2A) |
| `credit_transactions` | 크레딧 원장 — 잔액 = SUM(delta), 쓰기는 service role RPC만 (2-2B) |
| `webhook_events` | 웹훅 멱등성(event_id PK) — 크레딧 이중 지급 방지 (2-2B) |
| `analysis_reports` | 신규 분석 리포트(user_id 귀속) — 2-2D 스키마 선행 생성, 차감 RPC 의존 (2-2B) |
| `airbnb_pins` | 에어비앤비 매물 핀 — 익명 키·좌표·동·침실수만 (화이트리스트 컬럼 원칙, 2-2C) |
| `subscriptions` | Polar 구독 상태 미러(마이그레이션 20260715000001) — 크레딧·잔액 무관, 상태 표시·중복 구독 방지·포털 연결용 (2-2H) |

### 환경변수 현황 (2026-07-08 기준)

| 변수 | 상태 |
|------|------|
| `AIRROI_API_KEY` | ✅ 등록 완료 |
| `POLAR_ACCESS_TOKEN` | ✅ 등록 완료 |
| `POLAR_PRODUCT_ID` | ✅ 등록 완료 (구 단건 상품 — 신규 코드 미사용, 2-2F에서 정리) |
| `POLAR_PRODUCT_ID_BASIC` | ⏳ 미등록 — Polar Basic 상품 생성 후 로컬+Vercel 등록 필요 |
| `POLAR_PRODUCT_ID_PRO` | ⏳ 미등록 — Polar Pro 상품 생성 후 로컬+Vercel 등록 필요 |
| `POLAR_SUBSCRIPTION_ID_BASIC` | ⏳ 미등록 — Polar Recurring 월간 상품(월간 Basic) 생성 후 로컬+Vercel 등록 필요 (2-2H) |
| `POLAR_SANDBOX` | ✅ `false` (Production) |

### AirROI API 확정 스펙

- Base URL: `https://api.airroi.com`
- Auth: `X-API-KEY` 헤더 (대문자)

| 엔드포인트 | 메서드 | 파라미터 | 비고 |
|------------|--------|----------|------|
| `/markets/search` | GET | `?query=` | 쿼리스트링만 |
| `/markets/lookup` | GET | `?lat=&lng=` | 단일 객체 반환, `district` null 가능 |
| `/calculator/estimate` | GET | `?lat=&lng=&bedrooms=2&baths=1&guests=4` | |
| `/markets/summary` | POST | body: `{ market, currency, num_months }` | `currency`는 `"native"` 또는 `"usd"` **only** (`"krw"` 불가) |

### AirROI API 주의사항

- `/calculator/estimate`는 `bedrooms`, `baths`, `guests`가 **필수** — 없으면 400 에러 (`"Parameters 'bedrooms', 'baths', and 'guests' are required."`)
- `comparable_listings` 배열에 개별 숙소 실명·호스트명·사진URL·등록증번호·개별 `performance_metrics`(`ttm_revenue`, `ttm_occupancy` 등)가 포함됨
  - DB 저장(보유)은 문제없음으로 확인됨 (2026-06)
  - **화면 노출은 집계값만**: `percentiles`, `average_daily_rate`, `occupancy` 등 통계값만 사용 — 개별 listing 데이터 절대 노출 금지
- **엔드포인트별 집계 단위 사전 확인 필수 (2026-06-21 확인)**: `/calculator/estimate`는 "물건 1개 추정용" 엔드포인트로 광역 comparable로 스무딩됨 — 동 단위 비교 지표에 부적합. Phase 2-1 Step C에서 16개 동 occupancy 조회 시 47~55% 범위로 수렴(외도민 0개 동 vs 307개 동이 8pp 차이)해 변별력 없음 확인. 동 단위 통계가 필요하면 다른 엔드포인트(`/markets/summary` 등) 응답 구조를 직접 검증 후 사용할 것 (가정 금지)
- **[조사 필요] AirROI 매물개수(comparable count) 지표 전환 검토 (2026-06-27)**: 현재 "경쟁밀도"는 외도민(공공데이터, 인허가 기준) 개수 사용. 본래 사용자가 궁금한 건 "실제 플랫폼에서 영업 중인 매물 수"에 더 가까워 AirROI 전환 검토했으나, `/calculator/estimate` 응답(`EstimateResponse`)엔 매물 개수 필드 자체가 없음(revenue/ADR/occupancy/percentiles만 존재) — 이 엔드포인트는 애초에 "물건 1개 추정용"이라 매물 카운트를 안 줌. `/markets/summary` 등 다른 엔드포인트에 매물 개수 필드가 있는지, 있다면 동별 변별력이 있는지(Step C와 동일한 광역 스무딩 위험) 별도 조사 필요. 조사 전까지 외도민 데이터 유지.

## 외도민 데이터 & 경쟁밀도

- **데이터 출처**: 공공데이터포털 CSV 수동 다운로드 → Supabase `minbak_listings` 적재, 자동 갱신 없음 (Phase 2 자동화 검토 예정)
- **조회 방식**: `get_nearby_minbak(user_lat, user_lng, radius_m)` RPC — 좌표 기준 반경 쿼리 (동 폴리곤이 아닌 centroid 기준 반경 500m 근사)
- **경쟁밀도 레이블 기준 — 용도별 분리 (절대 통일 금지)**:
  - `src/app/api/competition/route.ts` → `getLabel()`: 전국 임의 주소 대상, **밀도(개/km²) 기준** (≤20 적음 / 21~60 보통 / >60 치열) — 변경 시 전체 지역 영향
  - `src/components/explore/ExploreMapView.tsx` → `getMapoCompLabel()`: **마포구 16개 동 실측 개수 기준** (≤31 적음 / 32~96 보통 / ≥97 치열) — 타 구 확장 시 그 구 데이터로 재산정 필요
  - **두 기준 통일 금지**: 전국용과 특정구역용은 분포가 달라 같은 threshold를 쓰면 한쪽이 변별력을 잃음

### 마포구 16개 동 실측값 (반경 500m, 2026-06 기준)

서교동 307 / 연남동 204 / 성산1동 173 / 서강동 153 / 합정동 126 / 망원1동 96 / 대흥동 77 / 도화동 54 / 망원2동 47 / 신수동 44 / 공덕동 36 / 용강동 31 / 염리동 29 / 성산2동 6 / 아현동 6 / 상암동 0

## GeoJSON / 행정동 경계 데이터

- **출처**: [vuski/admdongkor](https://github.com/vuski/admdongkor) — 통계청 SGIS 기반, 무료, 인증키 불필요
- **파일 구조**:
  - `data/raw/`: 원본 전국 파일(33MB) 보관 — 프로덕션에 직접 로드 금지
  - `data/seoul-mapo-dong-centers.json` (2.2KB) — 동 centroid 좌표 (서비스용)
  - `data/seoul-mapo-dong-boundaries.json` (25.4KB) — 동 폴리곤 경계 (서비스용, 확장자 .json — Turbopack이 .geojson 미인식)
- **새 구 추가 시**: 원본에서 해당 구만 재필터링, 전국 파일 그대로 로드 금지

## 상품 구조 확정 (2026-06-21 전략 전환)

> **핵심 원칙: 동 단위 유료 결제 상품은 없다. 결제는 항상 주소 단위 리포트(9,900원).** → 2026-07-07 폐기, PRD_master_reconciliation.md 참고

### 유료/무료 경계

| 구분 | 동 지도 `/explore` | 주소 리포트 `/report` |
|------|-------------------|----------------------|
| 결제 | **무료** | 9,900원 |
| 역할 | 탐색 미끼 | 유료 핵심 |
| 노출 정보 | 외도민 개수·경쟁밀도 | 객단가·예상수익·종합점수(★별점) |
| 공유 리스크 | 낮음 (판단 불가 정보) | 없음 (개인 주소·월세 기반) |

### 동 단위 유료 폐기 사유 (재기획 시 반드시 재확인)

1. **공유 무력화**: 결제 후 캡처/화면공유로 전파 → 재결제 유도 불가
2. **실질감 부재**: 동 단위 통계는 "내 물건"과 거리감 → 지불 의향 낮음
3. **재결제 구조 없음**: 동 단위 정보는 1회성, 주소 기반은 물건마다 재결제 자연스러움

### 동 무료 영역 — 절대 준수

- **줘도 되는 것**: 외도민 개수, 면적당 경쟁밀도, AirROI 예약률 1개 지표
- **절대 무료로 주면 안 되는 것**: 객단가(ADR), 예상수익, 종합 입지 점수(★)
  - 이 세 가지가 결제 동기의 핵심 — 동 패널 노출 시 결제 유인 소실
  - 예약률 단독으론 판단 불가 → 결제해야 나머지를 알 수 있는 구조 유지

### 종합 입지 점수(★ 별점) 위치

- 동 패널(`/explore`): **없음** (2026-06-21 제거됨)
- 주소 리포트(`/report`) 결제 후에만 표시

### 폐기된 DB 설계 — 만들지 말 것

- `area_scores` 테이블 — **폐기**
- `report_purchases.report_type='area'` 분기 — **폐기**
- 과거 대화·코드에 이 잔재가 있으면 무시할 것

### AirROI 예약률 1지표 비용처리 (Step C)

- 16개 동 사전 1회 계산 후 정적 캐시 (minbak_listings 방식)
- 사용자 클릭마다 AirROI 호출 **절대 금지**
- 노출 시 "OO년 OO월 기준 추정치" 명시 필수

## 카카오맵 디버깅 노트

- **모바일 "지도를 불러올 수 없습니다"**: 코드 문제가 아닌 Kakao Developer Console Web 플랫폼 도메인 미등록이 주 원인 — 로컬 WiFi IP(`192.168.x.x`)로 모바일 접속 시 특히 흔함
- **모바일 테스트 권장**: 로컬 IP 대신 Vercel 프로덕션 도메인으로 직접 테스트 (단일 production 환경 원칙과 부합)
- **두 카카오 키 구분**:
  - `NEXT_PUBLIC_KAKAO_JS_KEY`: 브라우저 지도 SDK (`react-kakao-maps-sdk`)
  - `KAKAO_REST_API_KEY`: 서버 사이드 REST 지오코딩 전용 — 절대 `NEXT_PUBLIC_` 금지

## 카카오 로그인(OAuth) 디버깅 노트

- **KOE205(account_email) 에러**: 코드 스코프 문제가 아니라 Supabase 플랫폼 자체가 Kakao provider에 `account_email`/`profile_image`/`profile_nickname`을 강제 요청하는 알려진 버그(Supabase GitHub #29917, #36878). 해결은 카카오 개인 비즈앱 전환(사업자 등록 불필요)으로 `account_email` 동의항목을 여는 것. 2026-07-09 완료·확인.

## 전체 로드맵 요약

| Phase | 목표 | 트리거 | 상태 |
|-------|------|--------|------|
| 0 | 이메일 50명 + 시뮬레이터 | 즉시 시작 | ✅ 완료 |
| 1-1 | 건축물대장/경쟁밀도/공유 | 즉시 시작 | ✅ 완료 |
| 1-2 | AirROI + Polar 결제 + 지도 + 9,900원 리포트 | 이메일 50명 달성 | ✅ 완료 |
| 2-1 | 지도 기반 입지 탐색 (/explore, 마포구) | 유료 전환 10건 | ✅ 완료 |
| 2-2 | TOBE 웹 구조 전환 (인증→크레딧→핀 데이터→인라인 리포트→외피→정리, PRD_master_reconciliation.md §3) | 2-1 완료 후 | 🔨 진행 중 (2-2A·2-2B·2-2E·2-2F·2-2G·2-2H·2-2I·2-2J 코드 완료) |
| 2-3 | iCal/스파이모드/과세판독 (구 2-2에서 이월) | 2-2 완료 후 | ⏳ 대기 중 |
| 3 | 월 200만원 (서울 전역/요금제) | 월 100만원 돌파 | ⏳ 대기 중 |

## 남은 작업 (실오픈 전 필수)

- **Polar Payouts 설정**: polar.sh → Settings → Payouts에서 신분인증 + 정산계좌 등록 필요. 미완료 시 실제 정산 안 됨.
- **상품 가격 변경**: Polar 대시보드에서 현재 ₩800(테스트) → ₩9,900으로 변경 필요. Payouts 설정 완료 후 변경. → 2026-07-07 폐기, PRD_master_reconciliation.md 참고
- **Polar 크레딧 상품 2종 생성 (2-2B 수동 작업)**: Polar 대시보드에서 Basic(₩9,900)/Pro(₩24,900) 생성 → `POLAR_PRODUCT_ID_BASIC`/`POLAR_PRODUCT_ID_PRO` 환경변수 등록(로컬+Vercel). 구 단건 상품(₩800) 비활성화는 2-2F에서.
- **크레딧 마이그레이션 실행 (2-2B 수동 작업)**: `20260707000002_credits_ledger.sql` — 20260707000001(profiles) 선행 필수.
- **구독 상품 생성 + 마이그레이션 (2-2H 수동 작업)**: Polar 대시보드에 Recurring 월간 상품 "월간 Basic"(₩9,900/월) 생성 → `POLAR_SUBSCRIPTION_ID_BASIC` 환경변수 등록(로컬+Vercel) → Polar 웹훅에 subscription.* 이벤트 7종 추가 → `20260715000001_subscriptions.sql` 실행.
- **핀 마이그레이션 + 최초 적재 (2-2C 수동 작업)**: `20260709000001_airbnb_pins.sql` 실행 → `npm run fetch:airbnb-pins -- --count-only`로 견적($0.50) → 승인 후 `-- --limit=N --yes` 적재. 마포 전역 전량 ≈ $441 (호출당 $0.50 × ceil(8,812÷10)) — 예산/범위(동 단위 분할 적재 등) 결정 필요.
- **Phase 2-1 Step B**: ✅ 완료 (2026-06-21). 동 패널 CTA → `router.push('/checkout?dong=' + dong명)` → `/checkout` 페이지에서 `useSearchParams`로 읽어 안내문구·placeholder에 동 이름 반영. `address`만 `/api/checkout`에 전달, dong은 UI 표시 전용. `useSearchParams` 사용으로 `<Suspense>` 분리 적용(`CheckoutContent`/`CheckoutPage`).
- **Phase 2-1 Step C**: ✅ 완료 (2026-06-21). 외도민 개수+경쟁밀도만 무료 노출로 확정. AirROI `/calculator/estimate` occupancy는 동 단위 변별력 없음 확인 후 제외 — 재시도 시 다른 엔드포인트 응답 구조 먼저 검증 필수.
- **Phase 2-1 Step D-1**: ✅ 완료 (2026-06-22). 동 경계선(Polygon) 렌더링 + 4색 저채도 파스텔(인접동 구분) + 호버(핀/폴리곤 모두)·선택 시 강조 + 핀 중심좌표 면적가중 centroid 재계산. `data/seoul-mapo-dong-boundaries.geojson` → `.json` 확장자 변경(Turbopack .geojson 미인식 해결).
- **Phase 2-1 Step D-2**: ✅ 완료 (2026-06-27). 동별 면적(shoelace) + 외도민 개수 사전캐시 → 면적당 밀도(개/㎢), 33/66 percentile 동적 임계값, 폴리곤 3색+회색 전환, 범례 추가.
- **[조사 필요] AirROI 매물개수(comparable count) 지표 전환 검토**: 2026-06-27. 현재 "경쟁밀도"는 외도민(공공데이터, 인허가 기준) 개수 사용. `/calculator/estimate` 응답엔 매물 개수 필드 없음(revenue/ADR/occupancy/percentiles만) — 다른 엔드포인트(`/markets/summary` 등) 조사 필요, 있어도 Step C와 같은 동별 변별력 부재 위험 재검증 필요. 조사 전까지 외도민 데이터 유지.
- **[보류] 상암동 등 0개 동 표시 방식**: 2026-06-27. 외도민 0개인 동이 "0.0개/㎢"로 표시되는 게 오류처럼 보일 수 있음(상암동: 실제 데이터, 결측 아님). 표시 방식 개선 필요 시 재논의.
- Phase 2-1의 Step E는 별도 PRD 파일(PRD_phase2-1_StepE.md)로 관리
- **Phase 2-2 재정의**: TOBE 웹 구조 전환(PRD_master_reconciliation.md §3). iCal/스파이모드/과세판독은 Phase 2-3으로 이월.
- **[보류] 줌인 블록 단위 탐색**: 2026-06-21 발견. 매물 주소가 아직 없는 "입지 탐색 중" 사용자는 동 단위보다 세밀한 블록 단위 비교 정보를 원함. 단, 동 단위와 동일하게 "공유되면 무력화되는가" 문제 재발 우려 — 블록 단위도 주소가 아니므로 캡처 공유 시 재결제 유인 약화 가능. Phase 2-1 PRD 범위 아님, 별도 PRD 필요 시 재논의.

## 디자인
디자인 시스템: `docs/DESIGN.md` 참고 (절대 임의 변경 금지)

## CLAUDE.md 자동 업데이트 규칙

Claude Code는 아래 조건 발생 시 CLAUDE.md를 자동으로 수정한다.
사람이 수기로 편집하지 않는다.

### 업데이트 트리거
- Phase 완료 선언 시 → 해당 Phase 상태를 ✅ 완료로 변경, 완료일 기입
- 새 Phase 진입 시 → 현재 Phase 섹션 갱신, 로드맵 테이블 상태 🔨 진행 중으로 변경
- 새 컴포넌트/API 구현 완료 시 → Phase 구현 완료 목록 테이블에 행 추가
- 새 Phase PRD 생성 시 → 로드맵에 해당 Phase 행 추가, PRD 경로 연결

### 업데이트 형식
- 완료일: YYYY-MM-DD
- 상태 이모지: ✅ 완료 / 🔨 진행 중 / ⏳ 대기 중
- Phase 번호: 1-1, 1-2, 2, 3 형식 유지

## 작업 원칙

- 여러 단계가 필요한 작업은 시작 전에 계획을 세우고, 단계마다 결과를 검증한 뒤 다음으로 진행한다.
- 시작한 작업은 끝까지 완료한다. 계획만 말하고 멈추지 않는다. "수정했다"는 말이 아니라 실제로 수정되고 검증된 코드가 완료의 기준이다.
- 막히면 조용히 넘어가지 말고 보고한다: 지금까지의 결과 + 막힌 지점 + 시도한 방법 + 대안.
- 모호한 요청은 가장 그럴듯한 해석을 명시하고 진행한다. 해석이 크게 갈릴 때만 질문하고, 질문은 한 번에 하나만 한다.
- 완료 선언은 요구 조건을 실제로 충족했는지 확인한 뒤에만 한다(빌드 통과, 테스트 통과, 요청 범위 반영).

## 코드 수정 규칙

- 수정 전에 반드시 대상 파일을 실제로 읽는다. 읽지 않은 파일을 수정하지 않는다.
- 요청된 범위만 고친다. 요청 없는 리팩터링, 기능 추가, 스타일 변경, 주석 대량 수정은 하지 않는다. 도움이 될 것 같으면 작업 완료 후 제안만 한다.
- 존재하지 않는 API·함수·라이브러리를 추측으로 쓰지 않는다. 실제 코드, 타입 정의, 공식 문서에서 확인한 뒤 사용한다. 확인하지 못했으면 그 사실을 밝힌다.
- 수정 후에는 테스트나 빌드로 검증한다. 검증 명령이 없으면 최소한 문법·타입 체크라도 수행한다.
- 기존 코드 스타일과 프로젝트 컨벤션을 따른다. 내 취향으로 바꾸지 않는다.

## 명령·도구 실행

- 명령이 실패하면 원인을 확인하고 방법을 바꿔 1~2회 재시도한다. 그래도 실패하면 실패 사실·원인·대안을 보고한다. 성공한 척하지 않는다.
- 같은 명령을 무의미하게 반복하지 않는다.
- 다음 작업은 실행 전에 반드시 사용자 확인을 받는다: git push --force, 브랜치·파일 대량 삭제, DB 마이그레이션·시드 실행, 배포, 외부 API로의 실제 발송·결제, .env 등 시크릿 파일 수정.
- 조회, 읽기, 로컬 빌드, 테스트는 확인 없이 바로 진행한다.

## 파일·데이터 처리

- 사용자가 언급한 파일이 실제로 존재하는지 먼저 확인한다. 없으면 없다고 알린다. 있는 척 작업하지 않는다.
- 큰 파일은 구조(디렉터리, 헤더, 함수 목록)를 먼저 파악한 뒤 관련 부분을 정독한다.
- 파일 생성 요청에는 실제 파일을 만들고 경로를 알려준다. 내용을 채팅에만 출력하고 끝내지 않는다.

## 보안

- 악성 코드(멀웨어, 익스플로잇, 랜섬웨어, 피싱, 계정 탈취, 서비스 마비 도구)는 어떤 명분으로도 작성·개선하지 않는다.
- 방어적 보안은 지원한다: 취약점 지적과 수정, 보안 설정 검토, 로그 분석.
- 시크릿(API 키, 비밀번호, 토큰)을 코드에 하드코딩하지 않는다. 기존 코드에서 발견하면 경고하고 환경변수 분리를 제안한다.
- 시크릿 값을 로그, 커밋 메시지, 출력에 노출하지 않는다.

## 불확실성 처리

- 확신 없는 정보(라이브러리 동작, 버전별 차이, 설정의 효과)는 사실처럼 쓰지 않는다. 코드나 문서로 확인하거나 "확실하지 않다"고 밝힌다.
- 사용자가 오류를 지적하면 먼저 사실을 확인한다. 맞으면 간결히 인정하고 수정하고, 틀린 지적이면 근거를 들어 정중히 기존 판단을 유지한다.
- 내 이전 작업의 오류를 발견하면 지적받기 전에 먼저 정정한다.

## 완료 전 체크리스트

1. 수정 대상 파일을 실제로 읽었는가?
2. 요청 범위를 벗어난 변경이 없는가?
3. 추측으로 쓴 API·함수가 없는가?
4. 테스트나 빌드로 검증했는가?
5. 파급 효과가 큰 명령에 사용자 확인을 받았는가?
6. 시크릿이 코드나 출력에 노출되지 않았는가?
7. 실패하거나 미완성인 부분을 숨기지 않고 보고했는가?
