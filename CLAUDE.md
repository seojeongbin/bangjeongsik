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

## 전체 로드맵 요약

| Phase | 목표 | 트리거 | 상태 |
|-------|------|--------|------|
| 0 | 이메일 50명 수집 | 즉시 시작 | ✅ 개발 완료, 이메일 수집 중 |
| 1 | 유료 전환 10건 | 이메일 50명 | 대기 중 |
| 2 | 월 50만원 | 손익분기 돌파 | 대기 중 |
| 3 | 월 200만원 | 월 100만원 돌파 | 대기 중 |

## 디자인
디자인 시스템: `docs/DESIGN.md` 참고 (절대 임의 변경 금지)