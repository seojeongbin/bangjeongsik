# 방정식 디자인 시스템 v3 (확정)

> 컨셉: "한국 40대가 신뢰하는 부동산 데이터 서비스"
> 레퍼런스: 부동산플래닛 (메인) + 아실/디스코 (정보 밀도 참고)
> 방향: 라이트 모드, 블루 그라데이언트 포인트, 카드 중심, 군더더기 없음

---

## 1. 폰트

```
Pretendard (한국어 최적화 — 필수)
CDN: https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css

웨이트: 400 / 500 / 600 / 700 / 800 / 900
라인높이: 제목 1.2 / 본문 1.8 (한국어 가독성)
자간: 제목 -0.03~-0.05em / 본문 기본값
```

---

## 2. 컬러

```css
/* 브랜드 그라데이언트 */
--brand-gradient: linear-gradient(135deg, #1a56db, #0ea5e9);

/* 브랜드 단색 */
--brand-primary: #1a56db;
--brand-light:   #0ea5e9;
--brand-subtle:  #EEF4FF;
--brand-border:  #BDD0F5;

/* 배경 */
--bg-page:       #F0F5FF;   /* 전체 페이지 배경 */
--bg-hero:       linear-gradient(155deg, #E8F0FF 0%, #F5F9FF 45%, #E8F5FF 100%);
--bg-card:       #FFFFFF;
--bg-nav:        #FFFFFF;

/* 텍스트 */
--text-primary:   #0F172A;
--text-secondary: #64748B;
--text-muted:     #94A3B8;

/* 보더 */
--border-default: #E2EAF8;
--border-medium:  #CBD5E1;

/* 시맨틱 */
--success:        #16A34A;
--success-bg:     #DCFCE7;
--success-border: #BBF7D0;
--warning:        #D97706;
--warning-bg:     #FEF3C7;
--warning-border: #FDE68A;
--danger:         #DC2626;
--danger-bg:      #FEE2E2;
--danger-border:  #FECACA;
```

---

## 3. 로고 & 브랜드

```
로고 텍스트: "방정식"
폰트: Pretendard 900 / letter-spacing: -0.05em / font-size: 23px
색상: linear-gradient(135deg, #1a56db, #0ea5e9) — 텍스트 클립
부제: "숙소 입지부터 수익까지, 당신 방의 수익을 위한 단 하나의 공식"
부제 스타일: 9.5px / weight 500 / color #94A3B8
```

---

## 4. 네비게이션

```
height: 66px
bg: #FFFFFF
border-bottom: 1px solid #E2EAF8
box-shadow: 0 1px 6px rgba(26,86,219,0.06)
position: sticky top-0 z-50
```

---

## 5. 버튼

```
[Primary — 가장 중요한 CTA]
background: linear-gradient(135deg, #1a56db, #0ea5e9)
color: #fff / font-weight: 800 / font-size: 15px
padding: 13px 26px / border-radius: 11px
box-shadow: 0 6px 20px rgba(26,86,219,0.38)
텍스트 끝에 → 화살표 포함

[Ghost Blue — 보조 CTA]
background: #EEF4FF / border: 1.5px solid #BDD0F5
color: #1a56db / font-weight: 700 / border-radius: 11px
padding: 12px 22px

[Secondary — 일반]
background: #fff / border: 1.5px solid #CBD5E1
color: #374151 / font-weight: 600
box-shadow: 0 2px 8px rgba(0,0,0,0.06)

[Success]
background: #F0FDF4 / border: 1.5px solid #BBF7D0
color: #16A34A / font-weight: 700

[Danger]
background: #FEF2F2 / border: 1.5px solid #FECACA
color: #DC2626 / font-weight: 700

공통: border-radius 11px / font-family Pretendard / cursor pointer
```

---

## 6. 카드

```
background: #FFFFFF
border: 1px solid #E2EAF8
border-radius: 18px
padding: 20px
box-shadow: 0 2px 12px rgba(0,0,0,0.04)

카드 상단 구조:
  - 좌: 아이콘 박스 (38px, border-radius 11px, 시맨틱 배경색)
  - 우: 상태 칩 (작은 뱃지)
카드 중단: 라벨(12px muted) + 수치(1.85rem 900 letter-spacing -0.04em)
카드 하단: 부연설명(12px muted)
```

---

## 7. 수치 표시

```
순수익 (긍정): font-size 1.85rem / font-weight 900 / color #16A34A
ROI:           font-size 1.85rem / font-weight 900 / color #1a56db
회수기간 (주의): font-size 1.85rem / font-weight 900 / color #D97706
위험 지표:      font-size 1.85rem / font-weight 900 / color #DC2626
```

---

## 8. 상태 칩 (카드 우상단)

```
padding: 3px 10px / border-radius: 6px / font-size: 11px / font-weight: 700

긍정: bg #DCFCE7 / color #15803D
정보: bg #DBEAFE / color #1D4ED8
주의: bg #FEF3C7 / color #B45309
위험: bg #FEE2E2 / color #B91C1C
```

---

## 9. 태그 / 뱃지

```
padding: 6px 14px / border-radius: 9999px / font-size: 13px / font-weight: 600
border: 1px solid (시맨틱 border색)

정보:  bg #EEF4FF  / color #1a56db  / border #BDD0F5
성공:  bg #DCFCE7  / color #15803D  / border #BBF7D0
주의:  bg #FEF3C7  / color #B45309  / border #FDE68A
위험:  bg #FEE2E2  / color #B91C1C  / border #FECACA
중립:  bg #F1F5F9  / color #475569  / border #E2E8F0
```

---

## 10. 인풋

```
border: 1.5px solid #CBD5E1
border-radius: 11px
padding: 13px 16px / font-size: 15px
background: #fff
box-shadow: 0 2px 6px rgba(0,0,0,0.04)
focus: border-color #1a56db + ring 3px #EEF4FF
placeholder: #9CA3AF
height: 50px
```

---

## 11. 히어로 이메일 박스

```
이메일 인풋 + 버튼을 하나의 박스로 통합
background: #fff
padding: 5px 5px 5px 18px
border-radius: 14px
border: 1.5px solid #BDD0F5
box-shadow: 0 4px 20px rgba(26,86,219,0.1)
```

---

## 12. 히어로 배지

```
background: #fff
border: 1px solid #BDD0F5
color: #1a56db / font-size: 12px / font-weight: 700
padding: 6px 16px / border-radius: 9999px
box-shadow: 0 2px 8px rgba(26,86,219,0.1)
좌측에 그라데이언트 점(7px 원) 포함
```

---

## 13. 면책문구

```
background: #F8FAFF
border-left: 3px solid #93C5FD
padding: 14px 18px
border-radius: 0 12px 12px 0
font-size: 12px / color: #64748B / line-height: 1.8
```

---

## 14. 레이아웃

```
최대 너비: max-w-5xl (1024px)
페이지 배경: #F0F5FF
섹션 패딩: py-16
카드 그리드: 모바일 1열 → 768px+ 2열 → 1024px+ 3~4열
gap: 12px
```

---

## 15. Tailwind 커스텀 (tailwind.config.ts)

```js
extend: {
  colors: {
    brand: {
      primary: '#1a56db',
      light:   '#0ea5e9',
      subtle:  '#EEF4FF',
      border:  '#BDD0F5',
    },
    surface: {
      page:    '#F0F5FF',
      card:    '#FFFFFF',
      hero:    '#E8F0FF',
    },
    content: {
      primary:   '#0F172A',
      secondary: '#64748B',
      muted:     '#94A3B8',
    },
    line: {
      default: '#E2EAF8',
      medium:  '#CBD5E1',
    },
    positive: { DEFAULT: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
    caution:  { DEFAULT: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    risk:     { DEFAULT: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  },
  borderRadius: {
    card: '18px',
    btn:  '11px',
    pill: '9999px',
  },
  boxShadow: {
    card:    '0 2px 12px rgba(0,0,0,0.04)',
    btn:     '0 6px 20px rgba(26,86,219,0.38)',
    hero:    '0 4px 20px rgba(26,86,219,0.10)',
    nav:     '0 1px 6px rgba(26,86,219,0.06)',
  }
}
```
