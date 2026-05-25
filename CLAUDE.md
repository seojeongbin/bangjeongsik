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

- **개별 숙소 노출 — 출처별 분기 (2026-05 갱신):**
  - 공공데이터(외도민): 상호·주소 노출 가능 (연락처·대표자 실명 제외)
  - AirROI(한국 범위): 노출 가능 (운영자 허가 확인). 단 **핵심 가치는 동네 평균 통계**이므로 평균을 우선 노출
  - "연희동 2룸 평균 객단가 N만원" 형태를 기본으로 유지
- 법적/세무 결과물: 반드시 "참고용 시뮬레이션, 최종 확인은 담당자에게" 면책문구 포함
- 데이터 기준일: 모든 리포트에 수집/캐시 기준일 명시 필수
- 외도민 기준: 1군(365일) 기준 설계, 특례(180일) 보정 문구 리포트 하단 필수
- 결제 후 접근: 리포트 토큰은 **반드시 Polar 결제 완료 웹훅 수신 후** 발급
- 결제 안내: 결제 전 확인창 + "무엇이 열리는지/환불·복원 정책" 명시 필수
- 권한 체크: URL 숨김·로그인만으로 보안 처리 금지. report_token 검증이 핵심
- AirROI 비용 통제: 캐시 우선 + 일일 호출 상한 + 급증 시 알림

## 현재 Phase

**Phase 1-2 — 진행 중 (2026-05-25)**
AirROI 데이터 + Polar 결제 + 지도 시각화로 9,900원 단건 리포트 판매.
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

## 전체 로드맵 요약

| Phase | 목표 | 트리거 | 상태 |
|-------|------|--------|------|
| 0 | 이메일 50명 + 시뮬레이터 | 즉시 시작 | ✅ 완료 |
| 1-1 | 건축물대장/경쟁밀도/공유 | 즉시 시작 | ✅ 완료 |
| 1-2 | AirROI + Polar 결제 + 지도 + 9,900원 리포트 | 이메일 50명 달성 | 🔨 진행 중 |
| 2 | 월 50만원 (iCal/스파이모드/과세판독) | 유료 전환 10건 | ⏳ 대기 중 |
| 3 | 월 200만원 (서울 전역/요금제) | 월 100만원 돌파 | ⏳ 대기 중 |

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
