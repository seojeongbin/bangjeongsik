# 방정식 (Bangjeongsik)

> 숙박업 창업을 위한 10초 입지 스코어링 & 리스크 탐지기  
> 슬로건: "숙소 입지부터 마진 계산까지, 당신 방의 수익을 위한 단 하나의 공식"

## 기술 스택 (절대 변경 금지)

- Framework: Next.js 14 (App Router)
- Language: TypeScript strict
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL)
- Deploy: Vercel (Hobby 플랜)
- Payment: Creem (MOR, Phase 1부터)

## 금지 사항

- Bootstrap, Material UI, CSS modules, styled-components 사용 금지
- 새 라이브러리 추가 전 반드시 확인 요청
- 특정 숙소 개별 데이터 노출 금지 (반드시 통계 가공값만 노출)

## 핵심 비즈니스 원칙

- 개별 숙소 노출 금지: "연희동 2룸 평균 객단가 N만원" 형태로만 제공
- 법적/세무 결과물: 반드시 "참고용 시뮬레이션, 최종 확인은 담당자에게" 면책문구 포함
- 데이터 기준일: 모든 리포트에 수집 기준일 명시 필수
- 결제 후 API 호출: 스파이 모드는 반드시 결제 완료 웹훅 이후에만 Apify API 호출
- 외도민 기준: 1군(365일) 기준으로 설계, 특례(180일) 보정 문구 리포트 하단 필수 삽입

## 현재 Phase

**Phase 1-1 — 진행 중 (2026-04-01)**
Apify/결제 없이 구현 가능한 기능으로 서비스 실체감 부여 → 이메일 재수집 목표.
PRD 문서: `docs/PRD_phase1-1.md` 참고

**Phase 0 — 완료 (2026-03-29)**
랜딩페이지 & 수익 시뮬레이터 개발 완료. Vercel 배포 완료.
현재 목표: 이메일 50명 수집 → Phase 1 진입
PRD 문서: `docs/PRD_phase0.md` 참고

### Phase 0 구현 완료 목록

| 컴포넌트 | 파일 경로 | 설명 |
|----------|-----------|------|
| Navbar | `src/components/layout/Navbar.tsx` | f(방)정식 로고 + BookIcon |
| HeroSection | `src/components/layout/HeroSection.tsx` | 이메일 웨이트리스트 폼 → Supabase 저장 |
| SimulatorSection | `src/components/simulator/SimulatorSection.tsx` | 6개 입력 기반 수익성 계산기 |
| ResultCards | `src/components/simulator/ResultCards.tsx` | 월매출 / 순수익 / ROI / 원금회수기간 카드 |
| MonthlyLedger | `src/components/simulator/MonthlyLedger.tsx` | 12개월 창업 가계부 미리보기 (원금회수 하이라이트) |
| ComingSoonSection | `src/components/layout/ComingSoonSection.tsx` | 출시 예정 기능 섹션 |
| API: /api/waitlist | `src/app/api/waitlist/route.ts` | 이메일 수집 → Supabase `waitlist` 테이블 저장 |

**포함된 기능:**
- 모바일 반응형 디자인 전 컴포넌트 적용
- 세금 3.3% 자동 추정 포함 계산 로직
- 면책 문구 (시뮬레이션 참고용 안내) 포함
- 이미 등록된 이메일 중복 방지 (409 처리)
- 새 구독자 등록 시 Discord 웹훅 알림 (이메일, 시간(KST), 누적 구독자 수 포함)

### Supabase 클라이언트 구분

| 파일 | 키 | 용도 |
|------|----|------|
| `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/클라이언트 컴포넌트 전용 |
| `src/lib/supabase/server.ts` | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 (RLS 우회, Route Handler에서 사용) |

- **Route Handler(`/api/waitlist`)는 반드시 `supabaseAdmin`(`server.ts`) 사용** — anon 키로는 RLS에 막혀 count가 0으로 반환됨
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 붙이지 말 것 (클라이언트 노출 금지)

## 전체 로드맵 요약

| Phase | 목표 | 트리거 | 상태 |
|-------|------|--------|------|
| 0 | 이메일 수집 + 시뮬레이터 | 즉시 시작 | ✅ 완료 |
| 1-1 | 건축물대장/경쟁밀도/공유 기능 + 레이아웃 재배치 | 즉시 시작 | 🔨 진행 중 |
| 1-2 | Apify 수집 + 결제 연동 + 9,900원 리포트 | 이메일 50명 재달성 | 대기 중 |
| 2 | 월 50만원 | 유료 전환 10건 | 대기 중 |
| 3 | 월 200만원 | 월 100만원 돌파 | 대기 중 |

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