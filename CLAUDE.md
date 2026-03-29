# 방정식 (Bangjeongsik)

> 숙박업 창업을 위한 10초 입지 스코어링 & 리스크 탐지기  
> 슬로건: "숙소 입지부터 수익까지, 당신 방의 수익을 위한 단 하나의 공식"

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

**Phase 0** — 랜딩페이지 & 수익 시뮬레이터 (이메일 50명 수집 목표)  
PRD 문서: `docs/PRD_phase0.md` 참고

## 전체 로드맵 요약

| Phase | 목표 | 트리거 |
|-------|------|--------|
| 0 | 이메일 50명 수집 | 즉시 시작 |
| 1 | 유료 전환 10건 | 이메일 50명 |
| 2 | 월 50만원 | 손익분기 돌파 |
| 3 | 월 200만원 | 월 100만원 돌파 |

## 디자인
디자인 시스템: `docs/DESIGN.md` 참고 (절대 임의 변경 금지)