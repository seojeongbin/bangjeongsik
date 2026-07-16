'use client'

import dongMinbakCountRaw from '../../../data/seoul-mapo-dong-minbak-count.json'
import dongAreaRaw from '../../../data/seoul-mapo-dong-area.json'

// Phase 2-2F — 경쟁밀도 비교 막대. 선택 반경의 외도민 밀도(개/㎢)를 마포구
// 평균·최고 동과 비교 (사전 캐시 정적 데이터 — 추가 API 호출 없음).
// 강조형(emphasis): 이 위치만 브랜드 블루, 비교 기준은 그레이.

interface DongCount { dong_nm: string; count: number; fetched_at: string }
interface DongArea { dong_nm: string; area_sqkm: number }

const counts = dongMinbakCountRaw as DongCount[]
const areas = dongAreaRaw as DongArea[]

// 모듈 로드 시 1회 계산 — 마포구 평균 밀도 + 최고 밀도 동
const areaByDong = new Map(areas.map((a) => [a.dong_nm, a.area_sqkm]))
const totalCount = counts.reduce((s, c) => s + c.count, 0)
const totalArea = areas.reduce((s, a) => s + a.area_sqkm, 0)
const MAPO_AVG_DENSITY = totalArea > 0 ? totalCount / totalArea : 0

const topDong = counts.reduce<{ name: string; density: number }>(
  (best, c) => {
    const area = areaByDong.get(c.dong_nm)
    if (!area || area <= 0) return best
    const density = c.count / area
    return density > best.density ? { name: c.dong_nm, density } : best
  },
  { name: '', density: 0 },
)

const DATA_DATE = counts[0]?.fetched_at ?? ''

function CompareBar({
  label,
  density,
  max,
  emphasis,
}: {
  label: string
  density: number
  max: number
  emphasis?: boolean
}) {
  const width = max > 0 ? Math.max(density > 0 ? 2 : 0, (density / max) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-[11px] ${emphasis ? 'font-bold text-[#0F172A]' : 'text-[#64748B]'}`}>
          {label}
        </span>
        <span
          className={`text-[11px] ${emphasis ? 'font-black text-[#1D4ED8]' : 'font-semibold text-[#64748B]'}`}
        >
          {density.toFixed(1)}개/㎢
        </span>
      </div>
      <div className="h-[10px] rounded-full bg-[#EEF0F4] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${width}%`, background: emphasis ? '#1D4ED8' : '#667085' }}
        />
      </div>
    </div>
  )
}

interface Props {
  count: number
  radiusM: number
}

export default function CompetitionCompareChart({ count, radiusM }: Props) {
  const circleArea = Math.PI * Math.pow(radiusM / 1000, 2)
  const myDensity = circleArea > 0 ? count / circleArea : 0
  const max = Math.max(myDensity, MAPO_AVG_DENSITY, topDong.density)

  const ratio = MAPO_AVG_DENSITY > 0 ? myDensity / MAPO_AVG_DENSITY : null

  return (
    <div className="rounded-[12px] border border-[#E4E7EC] px-4 py-4" style={{ background: '#F8F9FB' }}>
      <p className="text-[12px] font-semibold text-[#0F172A] mb-0.5">주변 밀도 비교</p>
      <p className="text-[11px] text-[#94A3B8] mb-3">
        {ratio !== null && ratio > 0
          ? `이 위치는 마포구 평균의 약 ${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}배 밀도입니다`
          : '이 위치 반경에는 등록 외도민이 없습니다'}
      </p>
      <div className="space-y-3">
        <CompareBar label={`이 위치 (반경 ${radiusM}m)`} density={myDensity} max={max} emphasis />
        <CompareBar label="마포구 평균" density={MAPO_AVG_DENSITY} max={max} />
        {topDong.name && (
          <CompareBar label={`마포 최고 · ${topDong.name}`} density={topDong.density} max={max} />
        )}
      </div>
      {DATA_DATE && (
        <p className="mt-3 text-[10px] text-[#94A3B8]">
          행정동 면적 기준 환산 · 동별 집계 {DATA_DATE} 기준
        </p>
      )}
    </div>
  )
}
