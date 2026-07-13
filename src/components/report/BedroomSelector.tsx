'use client'

import { useState, useRef } from 'react'
import type { AirbnbAreaStats } from '@/lib/data/airbnbData'

// Phase 2-2F — 스펙 선택 컨트롤 전용으로 개편. 결과 표시는 부모(ReportSections)가
// 담당하고, 재조회된 stats는 onStatsChange로 리프트해 통계 칩·게이지·계절성
// 차트·수익성 계산기가 함께 갱신되도록 한다.

interface Props {
  token: string
  initialBedrooms: number
  initialBaths: number
  initialGuests: number
  onStatsChange: (stats: AirbnbAreaStats) => void
  onLoadingChange?: (loading: boolean) => void
}

const BEDROOM_OPTIONS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
]

const BATHS_OPTIONS = [1, 1.5, 2, 2.5, 3]

function guestOptions(bedrooms: number): number[] {
  const max = Math.max(bedrooms + 4, 8)
  return Array.from({ length: max - bedrooms + 1 }, (_, i) => i + bedrooms)
}

export default function BedroomSelector({
  token,
  initialBedrooms,
  initialBaths,
  initialGuests,
  onStatsChange,
  onLoadingChange,
}: Props) {
  const [bedrooms, setBedrooms] = useState(initialBedrooms)
  const [baths, setBaths]       = useState(initialBaths)
  const [guests, setGuests]     = useState(initialGuests)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [lastApplied, setLastApplied] = useState({ baths: initialBaths, guests: initialGuests })
  // 레이스 컨디션 방지 — 마지막 요청 ID와 다른 응답은 버림
  const reqIdRef = useRef(0)

  const hasPendingChanges = baths !== lastApplied.baths || guests !== lastApplied.guests

  function updateLoading(value: boolean) {
    setLoading(value)
    onLoadingChange?.(value)
  }

  async function callApi(br: number, bt: number, gs: number) {
    const reqId = ++reqIdRef.current
    updateLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/report/${token}/bedrooms-estimate?bedrooms=${br}&baths=${bt}&guests=${gs}`,
      )
      if (reqId !== reqIdRef.current) return
      if (!res.ok) throw new Error('FETCH_FAILED')
      const data = (await res.json()) as AirbnbAreaStats
      onStatsChange(data)
      setLastApplied({ baths: bt, guests: gs })
    } catch {
      if (reqId !== reqIdRef.current) return
      setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      if (reqId === reqIdRef.current) updateLoading(false)
    }
  }

  function handleBedroomClick(br: number) {
    if (br === bedrooms) return
    const newGuests = guests < br ? br : guests
    setBedrooms(br)
    setGuests(newGuests)
    callApi(br, baths, newGuests)
  }

  return (
    <div className="space-y-3">
      {/* 방 개수 선택 */}
      <div>
        <p className="text-[12px] font-semibold text-[#64748B] mb-2">방 개수</p>
        <div className="flex gap-2">
          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleBedroomClick(opt.value)}
              disabled={loading}
              className={[
                'flex-1 rounded-[10px] py-2 text-[13px] font-bold border transition-colors',
                bedrooms === opt.value
                  ? 'bg-[#1a56db] text-white border-[#1a56db]'
                  : 'bg-white text-[#64748B] border-[#E2EAF8] hover:border-[#1a56db] hover:text-[#1a56db]',
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 욕실 + 게스트 선택 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[12px] font-semibold text-[#64748B] mb-1 block">욕실</label>
          <select
            value={baths}
            onChange={(e) => setBaths(parseFloat(e.target.value))}
            className="w-full rounded-[10px] border border-[#E2EAF8] px-3 py-2 text-[13px] text-[#0F172A] bg-white focus:outline-none"
          >
            {BATHS_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}개</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[12px] font-semibold text-[#64748B] mb-1 block">최대 게스트</label>
          <select
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value, 10))}
            className="w-full rounded-[10px] border border-[#E2EAF8] px-3 py-2 text-[13px] text-[#0F172A] bg-white focus:outline-none"
          >
            {guestOptions(bedrooms).map((g) => (
              <option key={g} value={g}>{g}명</option>
            ))}
          </select>
        </div>
      </div>

      {/* 적용 버튼 — baths/guests 변경 후 명시적 제출 */}
      {hasPendingChanges && !loading && (
        <button
          onClick={() => callApi(bedrooms, baths, guests)}
          className="w-full rounded-[10px] bg-[#EEF4FF] text-[#1a56db] font-bold py-2 text-[13px] border border-[#BDD0F5] hover:bg-[#1a56db] hover:text-white transition-colors"
        >
          적용
        </button>
      )}

      {/* 에러 */}
      {error && !loading && (
        <p className="text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}
