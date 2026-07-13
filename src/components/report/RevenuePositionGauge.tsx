'use client'

import { estimateTopPercent } from '@/lib/report/seasonality'
import type { PercentilePoints } from '@/lib/data/airbnbData'

// Phase 2-2F — 수익 구간 분포 게이지. 선택 스펙의 예상 수익이 동네 분포
// (p25/p50/p75/p90)에서 어디에 위치하는지 단일 색상 램프(연블루→진블루)
// 트랙 + 마커로 표시. 개별 숙소가 아닌 집계 분포만 사용.

// 시퀀셜 램프 — 한 가지 색상(블루), 밝음→어두움 단조
const SEGMENT_COLORS = ['#EFF6FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#1a56db']

function fmtWan(n: number) {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
}

interface Props {
  /** 선택 스펙 예상 월 수익 (원) */
  estimate: number
  /** 월간 환산 revenue 분포 */
  percentiles: PercentilePoints
}

export default function RevenuePositionGauge({ estimate, percentiles }: Props) {
  const { p25, p50, p75, p90 } = percentiles
  const topPercent = estimateTopPercent(estimate, percentiles)

  // 스케일: 분포·추정값을 모두 포함 + 양쪽 10% 여백
  const span = Math.max(p90, estimate) - Math.min(p25, estimate)
  const lo = Math.max(0, Math.min(p25, estimate) - span * 0.12)
  const hi = Math.max(p90, estimate) + span * 0.12
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))

  const markerPos = pos(estimate)
  const stops = [pos(p25), pos(p50), pos(p75), pos(p90)]

  const ticks = [
    { label: '하위 25%', value: p25, at: stops[0] },
    { label: '중간', value: p50, at: stops[1] },
    { label: '상위 25%', value: p75, at: stops[2] },
    { label: '상위 10%', value: p90, at: stops[3] },
  ]

  return (
    <div className="rounded-[12px] border border-[#E2EAF8] px-4 py-4" style={{ background: '#FAFBFF' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
        <p className="text-[12px] font-semibold text-[#0F172A]">이 동네 수익 분포에서 내 위치</p>
        {topPercent !== null && (
          <p className="text-[13px] font-black" style={{ color: '#1a56db', letterSpacing: '-0.02em' }}>
            상위 약 {topPercent}% 수준
          </p>
        )}
      </div>
      <p className="text-[11px] text-[#94A3B8] mb-5">
        비슷한 조건 숙소들의 월 수익 분포 기준 추정 (개별 숙소 아님)
      </p>

      {/* 마커 라벨 — 트랙 위 */}
      <div className="relative h-[20px]">
        <div
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{
            left: `${markerPos}%`,
            transform: `translateX(${markerPos < 12 ? '0' : markerPos > 88 ? '-100%' : '-50%'})`,
          }}
        >
          <span className="text-[11px] font-black text-[#0F172A]">
            내 예상 {fmtWan(estimate)}
          </span>
        </div>
      </div>

      {/* 트랙 — 시퀀셜 5구간, 2px 서피스 갭 */}
      <div className="relative">
        <div className="flex h-[12px] rounded-full overflow-hidden" style={{ gap: '2px' }}>
          {[lo, ...[p25, p50, p75, p90]].map((start, i) => {
            const end = i < 4 ? [p25, p50, p75, p90][i] : hi
            const width = pos(end) - pos(start)
            if (width <= 0) return null
            return (
              <div
                key={i}
                style={{ width: `${width}%`, background: SEGMENT_COLORS[i] }}
              />
            )
          })}
        </div>
        {/* 마커 */}
        <div
          className="absolute -translate-x-1/2"
          style={{ left: `${markerPos}%`, top: '-5px' }}
        >
          <div
            className="rounded-full"
            style={{
              width: '4px',
              height: '22px',
              background: '#0F172A',
              boxShadow: '0 0 0 2px #FAFBFF',
            }}
          />
        </div>
      </div>

      {/* 눈금 라벨 */}
      <div className="relative h-[34px] mt-2">
        {ticks.map((t, i) => (
          <div
            key={t.label}
            className="absolute text-center whitespace-nowrap"
            style={{
              left: `${t.at}%`,
              transform: `translateX(${t.at < 10 ? '0' : t.at > 90 ? '-100%' : '-50%'})`,
              display: i > 0 && t.at - ticks[i - 1].at < 9 ? 'none' : undefined,
            }}
          >
            <p className="text-[10px] text-[#94A3B8] leading-tight">{t.label}</p>
            <p className="text-[10px] font-bold text-[#64748B] leading-tight">{fmtWan(t.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
