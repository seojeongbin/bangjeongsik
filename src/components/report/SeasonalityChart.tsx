'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { Seasonality } from '@/lib/report/seasonality'

// Phase 2-2F — 계절성 차트. AirROI monthly_revenue_distributions 기반
// 12개월 수익 추이 + 연평균 기준선 + 성수기/비수기 자동 분류 표시.

const PEAK_COLOR = '#1a56db'   // 성수기 — 브랜드 블루
const OFF_COLOR = '#60A5FA'    // 비수기 — 같은 계열 연블루 (CVD 검증 통과)
const AVG_LINE_COLOR = '#64748B'

function fmtWan(n: number) {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
}

interface ChartDatum {
  name: string
  wan: number
  isPeak: boolean
}

function SeasonTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartDatum }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-[10px] border border-[#E2EAF8] bg-white px-3 py-2"
      style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.10)' }}
    >
      <p className="text-[11px] text-[#64748B]">{d.name}</p>
      <p className="text-[13px] font-bold text-[#0F172A]">
        {d.wan.toLocaleString('ko-KR')}만원
        <span
          className="ml-1.5 font-semibold"
          style={{ color: d.isPeak ? PEAK_COLOR : OFF_COLOR, fontSize: '11px' }}
        >
          {d.isPeak ? '성수기' : '비수기'}
        </span>
      </p>
    </div>
  )
}

export default function SeasonalityChart({ seasonality }: { seasonality: Seasonality }) {
  const data: ChartDatum[] = seasonality.months.map((m) => ({
    name: `${m.month}월`,
    wan: Math.round(m.revenue / 10000),
    isPeak: m.isPeak,
  }))
  const avgWan = Math.round(seasonality.monthlyAvg / 10000)

  return (
    <div>
      {/* 요약 — 성수기/비수기 개월수 (계산기 기본값과 동일한 도출값) */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {seasonality.uniform ? (
          <span className="rounded-full bg-[#F1F5F9] border border-[#E2E8F0] px-3 py-1 text-[11px] font-bold text-[#475569]">
            계절 변동 거의 없음
          </span>
        ) : (
          <>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
              style={{ background: '#EEF4FF', color: PEAK_COLOR, border: '1px solid #BDD0F5' }}
            >
              <span className="w-2 h-2 rounded-[3px]" style={{ background: PEAK_COLOR }} />
              성수기 {seasonality.peakCount}개월 · 평균 {fmtWan(seasonality.peakAvg)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
              style={{ background: '#F0F7FF', color: '#2563EB', border: '1px solid #DBEAFE' }}
            >
              <span className="w-2 h-2 rounded-[3px]" style={{ background: OFF_COLOR }} />
              비수기 {seasonality.offCount}개월 · 평균 {fmtWan(seasonality.offAvg)}
            </span>
          </>
        )}
      </div>

      <div style={{ width: '100%', height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F9" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: '#E2EAF8' }}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickFormatter={(v: number) => `${v.toLocaleString('ko-KR')}만`}
              width={52}
            />
            <Tooltip content={<SeasonTooltip />} cursor={{ fill: '#EEF4FF', opacity: 0.55 }} />
            <ReferenceLine
              y={avgWan}
              stroke={AVG_LINE_COLOR}
              strokeDasharray="4 4"
              label={{
                value: `연평균 ${avgWan.toLocaleString('ko-KR')}만`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: AVG_LINE_COLOR,
                fontWeight: 700,
              }}
            />
            <Bar dataKey="wan" radius={[4, 4, 0, 0]} maxBarSize={22}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.isPeak ? PEAK_COLOR : OFF_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 text-[11px] text-[#94A3B8]" style={{ lineHeight: '1.6' }}>
        AirROI 월별 수익 분포 기반 추정치입니다. 실제 매출은 운영 방식에 따라 달라질 수 있습니다.
      </p>
    </div>
  )
}
