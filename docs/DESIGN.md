# 방정식 디자인 시스템 v4 (확정 — 2026-07-16 전면 리디자인)

> 컨셉: "한국 40대가 신뢰하는 부동산 데이터 서비스"
> 레퍼런스: 네이버 지도 · 나이스비즈맵 (실용적 정보 밀도)
> 방향: 라이트 모드, 단색 브랜드 블루, 뉴트럴 그레이 층위 배경, 경계선 중심 구분
>
> **v3 → v4 변경 핵심 (AI 티 제거)**
> - 보라→파랑 대각선 그라데이션 전면 폐기 → 단색 `#1D4ED8`
> - 모든 카드 동일 둥근모서리+옅은 그림자 도배 폐기 → 경계선(1px)·배경 대비로 구분,
>   그림자는 플로팅 요소(모달·지도 오버레이·바텀시트)에만
> - 페이지 배경 연블루(#F0F5FF) 일변도 폐기 → 뉴트럴 #F7F8FA + 흰색 섹션 교차 층위
> - 이모지 아이콘 금지(lucide 단일 세트) / glassmorphism·blur 장식 금지 / 과도한 애니메이션 금지
> - 숫자(가격·수익·크레딧)는 `tabular-nums` 필수

---

## 1. 폰트

```
Pretendard (한국어 최적화 — 필수)
CDN: https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css

웨이트: 400 / 500 / 600 / 700 / 800 / 900
타이포 위계 (크기·굵기 차이를 명확히):
  Display  clamp(1.9rem, 5vw, 3rem) / 900 / -0.04em  (랜딩 히어로 전용)
  H1       clamp(1.5rem, 4vw, 2rem) / 800 / -0.03em
  H2(섹션) 1.15rem / 700 / -0.02em
  본문      14~15px / 400~500 / line-height 1.7~1.8
  캡션      12px / 500 / muted
  각주      11px / faint
숫자: font-variant-numeric: tabular-nums (Tailwind `tabular-nums` 클래스)
```

---

## 2. 컬러 (globals.css `@theme` 토큰과 1:1)

```css
/* 브랜드 — 단색만. 그라데이션 금지 */
--color-brand-primary: #1D4ED8;   /* 메인 CTA·핵심 숫자·활성 상태 전용 */
--color-brand-strong:  #1E40AF;   /* hover / active */
--color-brand-subtle:  #EEF4FF;   /* 브랜드 틴트 배경 (선택 상태·강조 박스) */
--color-brand-border:  #BDD0F5;

/* 배경 층위 — 흰색과 뉴트럴 그레이 교차로 깊이감 */
--color-surface-page:   #F7F8FA;  /* 페이지 기본 배경 */
--color-surface-card:   #FFFFFF;  /* 본문/카드 */
--color-surface-sunken: #F1F3F6;  /* 인셋(테이블 헤더·비활성 트랙) */
--color-surface-tint:   #F8F9FB;  /* 카드 내 보조 박스 */

/* 텍스트 — 순검정 금지 */
--color-content-primary:   #0F172A;
--color-content-secondary: #475569;
--color-content-muted:     #64748B;
--color-content-faint:     #94A3B8;  /* 각주·비활성 전용 (본문 금지) */

/* 경계선 — 뉴트럴 */
--color-line-default: #E4E7EC;
--color-line-strong:  #D0D5DD;

/* 시맨틱 */
--color-positive: #16A34A;  bg #DCFCE7  border #BBF7D0
--color-caution:  #D97706;  bg #FEF3C7  border #FDE68A
--color-risk:     #DC2626;  bg #FEE2E2  border #FECACA
```

**위계 원칙**: 전부 강조 = 강조 없음. 브랜드 블루는 화면당 1개의 주 CTA와
핵심 숫자에만. 나머지는 그레이 스케일로 눌러 대비를 만든다.
명도 대비는 WCAG AA(본문 4.5:1) 이상 — `#1D4ED8` on white = 6.3:1.

---

## 3. 로고 & 브랜드

```
로고 텍스트: "f(방)정식"
폰트: Pretendard 900 / letter-spacing -0.04em
색상: "방" = #1D4ED8 단색 (그라데이션 텍스트 클립 폐기), 나머지 = #0F172A
부제: "숙소 입지부터 수익까지, 당신 방의 수익을 위한 단 하나의 공식"
부제 스타일: 9.5px / 500 / #94A3B8 (md+ 노출)
```

---

## 4. 네비게이션

```
height: 60px
bg: #FFFFFF
border-bottom: 1px solid #E4E7EC (그림자 없음)
position: sticky top-0 z-50
활성 메뉴: text #1D4ED8 + bg #EEF4FF / 비활성: #475569
마이페이지 링크는 로그인 시에만 노출
```

---

## 5. 버튼

```
[Primary — 화면당 1개]
background: #1D4ED8 (단색) / hover: #1E40AF
color: #fff / 700~800 / 14~15px
padding: 12px 24px / border-radius: 10px
그림자 없음 (글로우 금지)

[Ghost Blue — 보조]
background: #EEF4FF / border: 1px solid #BDD0F5
color: #1D4ED8 / 700 / radius 10px

[Secondary — 일반]
background: #fff / border: 1px solid #D0D5DD
color: #374151 / 600 / radius 10px

[Danger] bg #FEF2F2 / border #FECACA / color #DC2626

공통: radius 10px / active:scale-[0.98] 정도의 절제된 피드백만
```

---

## 6. 카드

```
background: #FFFFFF
border: 1px solid #E4E7EC
border-radius: 12px
padding: 20~24px
box-shadow: 없음 (경계선으로 구분)

구분이 더 필요하면 그림자 대신:
  - 배경 대비 (흰 카드 on #F7F8FA 섹션)
  - 카드 내 보조 박스는 #F8F9FB + 1px #E4E7EC
플로팅 요소(모달·지도 오버레이·바텀시트)만 그림자 허용:
  0 8px 24px rgba(15,23,42,0.14)
```

---

## 7. 수치 표시

```
핵심 숫자: 1.6~2rem / 900 / letter-spacing -0.03em / tabular-nums
색: 브랜드 지표 #1D4ED8 · 긍정 #16A34A · 주의 #D97706 · 위험 #DC2626
라벨: 12px / 500 / #64748B (숫자 위)
보조설명: 11~12px / #94A3B8 (숫자 아래)
```

---

## 8. 상태 칩 / 태그

```
칩: padding 3px 10px / radius 6px / 11px / 700
태그: padding 5px 12px / radius 9999px / 12px / 600 / border 1px

정보:  bg #EEF4FF / color #1D4ED8 / border #BDD0F5
성공:  bg #DCFCE7 / color #15803D / border #BBF7D0
주의:  bg #FEF3C7 / color #B45309 / border #FDE68A
위험:  bg #FEE2E2 / color #B91C1C / border #FECACA
중립:  bg #F1F3F6 / color #475569 / border #E4E7EC
```

---

## 9. 인풋

```
border: 1px solid #D0D5DD / radius 10px
padding: 12px 14px / font-size 15px / bg #fff
focus: border #1D4ED8 + ring 3px rgba(29,78,216,0.12)
placeholder: #9CA3AF / height 46~50px
```

---

## 10. 면책문구

```
background: #F8F9FB
border-left: 3px solid #93C5FD
padding: 14px 18px / radius 0 10px 10px 0
font-size: 12px / color #64748B / line-height 1.8
```

---

## 11. 레이아웃

```
최대 너비: max-w-5xl (1024px) — 마이페이지 등 문서형은 max-w-3xl
페이지 배경: #F7F8FA
섹션 배경 교차: 흰색 ↔ #F7F8FA (히어로 등 특수 섹션만 #EEF4FF 틴트 허용)
섹션 패딩: py-14~20
카드 그리드: 모바일 1열 → md 2열 → lg 3~4열 / gap 12~16px
```

---

## 12. 차트 (recharts — 2-2F 팔레트)

```
성수기/강조: #1D4ED8 · 비수기/보조: #93C5FD · 비교 기준(그레이): #98A2B3
그리드: #EEF0F4 (저대비) · 축 라벨: #94A3B8 10px
시퀀셜 램프(게이지): #EFF6FF → #BFDBFE → #93C5FD → #60A5FA → #1D4ED8
기준선: #64748B dashed
색만으로 의미 전달 금지 — 라벨·범례 병기
```

---

## 13. 금지 목록 (재확인)

- 보라→파랑 대각선 그라데이션 배경·버튼·텍스트 클립
- 카드 전체 동일 그림자 도배 (`0 2px 12px …` 일괄 적용)
- 이모지 아이콘 (lucide 단일 세트만)
- 의미 없는 glassmorphism / backdrop blur 장식
- 그라데이션 글로우 그림자 (`0 6px 20px rgba(브랜드,0.38)` 류)
- 과도한 애니메이션 (진입 stagger·패럴랙스 등)
