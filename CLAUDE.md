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
- 결제 후 접근: 리포트 토큰은 **반드시 Polar 결제 완료 웹훅 수신 후** 발급
- 결제 안내: 결제 전 확인창 + "무엇이 열리는지/환불·복원 정책" 명시 필수
- 권한 체크: URL 숨김·로그인만으로 보안 처리 금지. report_token 검증이 핵심
- AirROI 비용 통제: 캐시 우선 + 일일 호출 상한 + 급증 시 알림
- **신규 기능 기획 시 필수 체크 (2026-06-21 확정)**:
  - "공유되면 무력화되는가?" — 동 단위 유료 폐기를 이끈 핵심 질문. 캡처/공유로 콘텐츠가 퍼지면 재결제 없음
  - "동 단위인가 주소 단위인가?" — 동 단위로 값을 매기는 정보는 공유 리스크 재검토 필수. 주소 기반만 재결제 구조 성립
  - "미끼에 핵심 지표를 다 줬는가?" — 무료 영역은 판단 불가능한 1개 지표까지. 예약률+객단가 조합 등 판단 가능한 조합은 반드시 유료

## 현재 Phase

**Phase 2-1 — 🔨 진행 중 (2026-06-21~)**
지도 기반 입지 탐색 — `/explore` 페이지, 마포구 16개 동 동핀, 외도민 경쟁밀도 무료 표시 + **주소 리포트로 가는 깔때기** (2026-06-21 전략 전환: 동 단위 유료 결제 폐기).
- Step 1~3 완료: 지도·동핀·패널·무료 경쟁밀도·블러 잠금 UI (동 패널 별점·종합점수 섹션 제거됨)
- Step A(현재 결과물 배포): 착수 가능
- Step B(동 CTA → 주소 입력 → 기존 checkout 연결): ✅ 완료 (2026-06-21) — `/checkout?dong=` query string 전달, 신규 결제 로직 없음, 기존 checkout 재사용. CTA 문구 "정밀 분석 보기" → "주소 입력하고 정밀 분석받기"로 변경
- Step C(동 무료에 AirROI 예약률 1지표 — 사전 캐시 방식): ✅ 완료 (2026-06-21) — 외도민 개수+경쟁밀도만 무료 노출로 확정. AirROI `/calculator/estimate`는 동 단위가 아닌 마포구 광역 comparable로 스무딩되어 변별력 없음 확인(외도민 0개 동 vs 307개 동이 8pp 차이). 지표 제외 결정, 추후 다른 엔드포인트/데이터소스로 재시도 가능성 열어둠.
- Step D-1(동 경계선 표시): ✅ 완료 (2026-06-22) — 16개 동 GeoJSON 폴리곤 렌더링, 4색 저채도 파스텔 팔레트(인접 동끼리 다른 색), 호버/선택 시 강조, 핀 호버도 연동. 핀 중심 좌표를 점단순평균 → 면적가중 centroid로 재계산(extract-mapo-dong.mjs 수정)
- Step D-2(줌아웃 시 개수 상시표시 + 면적당 밀도 재산정): 미착수. 현재 `getMapoCompLabel()`은 절대개수 기준 임계값이라 "면적당" 표현과 불일치, 같이 보정 필요
- Step D-3(PC 호버): D-1에서 선반영 완료 — 별도 작업 불필요
- 구버전 Step 5(area 결제)/Step 6(area 캐시) **폐기** — `area_scores` 테이블·`report_type='area'` 만들지 않음
PRD 문서: `docs/PRD_phase2-1.md` 참고 (v2 개정판)

**Phase 1-2 — 완료 (2026-06-11)**
AirROI 데이터 + Polar 결제 + 지도 시각화로 9,900원 단건 리포트 판매 구현 완료.
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
| Polar 결제 — 웹훅 | `src/app/api/webhooks/polar/route.ts` | 결제 완료 이벤트 수신 → report_token 발급 |
| 리포트 페이지 | `src/app/report/[token]/page.tsx` | report_token 검증 후 AirROI 통계 리포트 렌더링 |
| 지도 시각화 | `src/components/report/ReportMap.tsx` | 카카오맵 + 경쟁 숙소 마커 |
| Sentry/Resend 모니터링 | `src/lib/monitoring.ts` | 에러 추적(Sentry) + 결제 완료 이메일(Resend) |

### Supabase 클라이언트 구분

| 파일 | 키 | 용도 |
|------|----|------|
| `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/클라이언트 컴포넌트 전용 |
| `src/lib/supabase/server.ts` | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 (RLS 우회, Route Handler) |

- Route Handler·웹훅·데이터 레이어는 반드시 `supabaseAdmin`(`server.ts`) 사용
- `SUPABASE_SERVICE_ROLE_KEY`에 절대 `NEXT_PUBLIC_` 금지

### Phase 1-2 신규 테이블

| 테이블 | 용도 |
|--------|------|
| `airroi_cache` | AirROI 응답 캐시 (90일, 비용 절감) |
| `report_purchases` | 결제 내역 + report_token |
| `airroi_usage` | AirROI 호출 모니터링 |
| `minbak_listings` | (기존) 외도민 공공데이터, 서울 |

### 환경변수 현황 (2026-06-15 기준)

로컬 `.env.local` 및 Vercel Production 모두 정상 등록 완료:

| 변수 | 상태 |
|------|------|
| `AIRROI_API_KEY` | ✅ 등록 완료 |
| `POLAR_ACCESS_TOKEN` | ✅ 등록 완료 |
| `POLAR_PRODUCT_ID` | ✅ 등록 완료 |
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

> **핵심 원칙: 동 단위 유료 결제 상품은 없다. 결제는 항상 주소 단위 리포트(9,900원).**

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

## 전체 로드맵 요약

| Phase | 목표 | 트리거 | 상태 |
|-------|------|--------|------|
| 0 | 이메일 50명 + 시뮬레이터 | 즉시 시작 | ✅ 완료 |
| 1-1 | 건축물대장/경쟁밀도/공유 | 즉시 시작 | ✅ 완료 |
| 1-2 | AirROI + Polar 결제 + 지도 + 9,900원 리포트 | 이메일 50명 달성 | ✅ 완료 |
| 2-1 | 지도 기반 입지 탐색 (/explore, 마포구) | 유료 전환 10건 | 🔨 진행 중 |
| 2-2 | iCal/스파이모드/과세판독 | 2-1 완료 후 | ⏳ 대기 중 |
| 3 | 월 200만원 (서울 전역/요금제) | 월 100만원 돌파 | ⏳ 대기 중 |

## 남은 작업 (실오픈 전 필수)

- **Polar Payouts 설정**: polar.sh → Settings → Payouts에서 신분인증 + 정산계좌 등록 필요. 미완료 시 실제 정산 안 됨.
- **상품 가격 변경**: Polar 대시보드에서 현재 ₩800(테스트) → ₩9,900으로 변경 필요. Payouts 설정 완료 후 변경.
- **Phase 2-1 Step B**: ✅ 완료 (2026-06-21). 동 패널 CTA → `router.push('/checkout?dong=' + dong명)` → `/checkout` 페이지에서 `useSearchParams`로 읽어 안내문구·placeholder에 동 이름 반영. `address`만 `/api/checkout`에 전달, dong은 UI 표시 전용. `useSearchParams` 사용으로 `<Suspense>` 분리 적용(`CheckoutContent`/`CheckoutPage`).
- **Phase 2-1 Step C**: ✅ 완료 (2026-06-21). 외도민 개수+경쟁밀도만 무료 노출로 확정. AirROI `/calculator/estimate` occupancy는 동 단위 변별력 없음 확인 후 제외 — 재시도 시 다른 엔드포인트 응답 구조 먼저 검증 필수.
- **Phase 2-1 Step D-1**: ✅ 완료 (2026-06-22). 동 경계선(Polygon) 렌더링 + 4색 저채도 파스텔(인접동 구분) + 호버(핀/폴리곤 모두)·선택 시 강조 + 핀 중심좌표 면적가중 centroid 재계산. `data/seoul-mapo-dong-boundaries.geojson` → `.json` 확장자 변경(Turbopack .geojson 미인식 해결).
- **Phase 2-1 Step D-2**: 줌아웃 시 동별 외도민 개수 핀 상시표시 + 면적당 밀도(㎢ 기준) 정확한 산정 — 미착수. 현재 `getMapoCompLabel()`은 절대개수 기준이라 "면적당" 표현과 불일치, 같이 보정 필요.
- **Phase 2-2 기획**: Phase 2-1 완료 후 시작 예정 (iCal/스파이모드/과세판독).
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
