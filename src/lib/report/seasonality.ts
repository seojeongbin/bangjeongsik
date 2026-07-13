// Phase 2-2F — 계절성 파생 로직 (순수 함수, 서버·클라이언트 공용).
// AirROI monthly_revenue_distributions(12개월 가중치, 합계≈1.0)를 월별 예상
// 매출로 환산하고 연평균 기준으로 성수기/비수기를 자동 분류한다.
// 이 도출값이 SeasonalityChart 표시값이자 ProfitCalculator의 기본 입력값 —
// 성수기/비수기 개월수 하드코딩 금지 원칙의 단일 소스.

export interface SeasonMonth {
  month: number    // 1~12
  revenue: number  // 원 단위 월 예상 매출
  isPeak: boolean  // 연평균 초과 여부
}

export interface Seasonality {
  months: SeasonMonth[]
  monthlyAvg: number   // 연매출 ÷ 12 (기준선)
  peakCount: number
  offCount: number
  peakAvg: number      // 성수기 평균 월매출
  offAvg: number       // 비수기 평균 월매출
  uniform: boolean     // 계절 변동이 사실상 없는 분포
}

/**
 * @param avgRevenue 월평균 매출(원) — AirbnbAreaStats.avgRevenue
 * @param monthlyDistributions 구 캐시(90일)에는 없을 수 있어 방어적으로 optional
 */
export function deriveSeasonality(
  avgRevenue: number,
  monthlyDistributions?: { month: number; weight: number }[] | null,
): Seasonality | null {
  if (!Number.isFinite(avgRevenue) || avgRevenue <= 0) return null
  if (!Array.isArray(monthlyDistributions) || monthlyDistributions.length !== 12) return null

  const totalWeight = monthlyDistributions.reduce(
    (sum, d) => sum + (Number.isFinite(d?.weight) && d.weight > 0 ? d.weight : 0),
    0,
  )
  if (totalWeight <= 0) return null

  const annual = avgRevenue * 12
  const monthlyAvg = avgRevenue

  const months: SeasonMonth[] = [...monthlyDistributions]
    .sort((a, b) => a.month - b.month)
    .map((d) => {
      const revenue = annual * ((d.weight > 0 ? d.weight : 0) / totalWeight)
      return { month: d.month, revenue, isPeak: revenue > monthlyAvg }
    })

  const peak = months.filter((m) => m.isPeak)
  const off = months.filter((m) => !m.isPeak)

  // 완전 균등 분포(가중치 전부 1/12)면 성수기 0개월 — 계절 변동 없음으로 처리
  const uniform = peak.length === 0 || off.length === 0

  const avgOf = (arr: SeasonMonth[]) =>
    arr.length > 0 ? arr.reduce((s, m) => s + m.revenue, 0) / arr.length : monthlyAvg

  return {
    months,
    monthlyAvg,
    peakCount: uniform ? 12 : peak.length,
    offCount: uniform ? 0 : off.length,
    peakAvg: uniform ? monthlyAvg : avgOf(peak),
    offAvg: uniform ? monthlyAvg : avgOf(off),
    uniform,
  }
}

/**
 * 예상 수익이 동네 분포(p25/p50/p75/p90)에서 상위 몇 %인지 추정.
 * 구간 사이는 선형 보간, 양 끝은 보수적으로 캡. 반환값은 "상위 N%"의 N (1~99).
 */
export function estimateTopPercent(
  value: number,
  p: { p25: number; p50: number; p75: number; p90: number },
): number | null {
  const pts: [number, number][] = [
    [p.p25, 25],
    [p.p50, 50],
    [p.p75, 75],
    [p.p90, 90],
  ]
  if (pts.some(([v]) => !Number.isFinite(v) || v <= 0) || !Number.isFinite(value)) return null
  // 분포가 단조 증가가 아니면 신뢰 불가
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] < pts[i - 1][0]) return null
  }

  let rank: number
  if (value <= pts[0][0]) {
    rank = Math.max(1, (value / pts[0][0]) * 25)
  } else if (value >= pts[3][0]) {
    rank = 90 + Math.min(9, ((value - pts[3][0]) / pts[3][0]) * 30)
  } else {
    rank = 25
    for (let i = 1; i < pts.length; i++) {
      const [v0, r0] = pts[i - 1]
      const [v1, r1] = pts[i]
      if (value <= v1) {
        rank = v1 === v0 ? r1 : r0 + ((value - v0) / (v1 - v0)) * (r1 - r0)
        break
      }
    }
  }
  return Math.min(99, Math.max(1, Math.round(100 - rank)))
}
