export const PAYMENT = {
  price: '9,900원',
  priceNote: '1회 단건 결제 · 부가세 포함',
  product: '입력 주소 통합 입지 분석 리포트 (즉시 열람)',
  includes: [
    '경쟁밀도 — 반경 500m 내 외도민 수 + 강도 레이블',
    '건축물대장 — 외도민 등록 가능성 추정',
    'AirROI 수익 데이터 — 동네 평균 ADR·예약률·월수익',
    '수익 시뮬레이터 — 월세 입력 → 순수익·ROI·원금회수기간',
    '창업 가계부 — 12개월 예상 손익표',
  ],
  accessPeriod: '발급 후 365일간 동일 링크로 재접속 가능',
  refundPolicy:
    '디지털 콘텐츠 특성상 리포트 열람 후 환불 불가. 열람 전(미접속) 상태에서 24시간 이내 요청 시 환불 처리.',
  contactEmail: 'bin3566602@gmail.com',
} as const

// Phase 2-2B: 횟수제 크레딧 상품 (PRD_master_reconciliation.md §1.A)
export const CREDIT_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    credits: 3,
    price: '9,900원',
    unitNote: '회당 3,300원',
    desc: '분석 3회권',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 10,
    price: '24,900원',
    unitNote: '회당 2,490원 · 9+1',
    desc: '분석 10회권 (9회 가격에 1회 추가)',
  },
} as const

// Phase 2-2H: 월간 구독 상품 (docs/PRD_phase2-2H_subscription.md)
// "월간 Basic 자동 구독 시 월 1회 무료" = 매 결제 주기마다 Basic 3회 + 보너스 1회 = 4회 지급
export const SUBSCRIPTION_PLAN = {
  id: 'sub_basic',
  name: '월간 Basic',
  credits: 4,
  price: '월 9,900원',
  unitNote: '매달 자동결제 · 회당 2,475원',
  desc: '매달 분석 4회 자동 충전 (3회 + 무료 1회)',
  bonusNote: '단건 Basic과 같은 가격에 매달 1회 무료 추가',
} as const

export const CREDIT_PAYMENT = {
  priceNote: '부가세 포함',
  usage: '크레딧 1개 = 주소(또는 핀) 1곳 정밀 분석 1회. 같은 리포트 재열람은 차감되지 않습니다.',
  refundPolicy:
    '크레딧을 1개도 사용하지 않은 경우 결제 후 24시간 이내 요청 시 전액 환불됩니다. 크레딧을 1회 이상 사용한 뒤에는 환불이 불가합니다.',
  subscriptionPolicy:
    '구독은 언제든 해지할 수 있으며, 해지 시 다음 결제일부터 청구되지 않습니다. 이미 지급된 크레딧은 해지 후에도 만료 없이 그대로 사용할 수 있습니다. 해당 결제 주기의 크레딧을 1개도 사용하지 않은 경우 결제 후 24시간 이내 요청 시 해당 월 결제분은 전액 환불됩니다.',
  contactEmail: 'bin3566602@gmail.com',
} as const

export const DISCLAIMER = {
  report:
    '본 리포트는 참고용 시뮬레이션이며, 최종 창업 결정은 전문가에게 확인하시기 바랍니다.',
  simulator:
    '본 시뮬레이션은 사용자 입력값 기반 추정치이며 실제 수익과 다를 수 있습니다.',
  building:
    '건물 등록 가능 여부는 건축물대장 기준 참고 추정치입니다. 최종 확인은 관할 구청에 직접 문의하세요.',
  airbnbStats:
    '수익·예약률 수치는 AirROI 추정 통계이며, 호스트 설정에 따라 실제와 다를 수 있습니다.',
  fullYearBasis:
    '본 리포트는 외국인관광도시민박업(365일 운영) 기준입니다. 특례 사업자(연 180일)의 경우 약 50% 수준으로 보정하세요.',
} as const
