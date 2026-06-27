'use client'

import { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { AirbnbAreaStats } from '@/lib/data/airbnbData'

interface Props {
  token: string
  initialBedrooms: number
  initialBaths: number
  initialGuests: number
  initialStats: AirbnbAreaStats
}

function fmtWan(n: number) {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
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
  initialStats,
}: Props) {
  const [bedrooms, setBedrooms] = useState(initialBedrooms)
  const [baths, setBaths]       = useState(initialBaths)
  const [guests, setGuests]     = useState(initialGuests)
  const [stats, setStats]       = useState<AirbnbAreaStats>(initialStats)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [lastApplied, setLastApplied] = useState({ baths: initialBaths, guests: initialGuests })
  // 레이스 컨디션 방지 — 마지막 요청 ID와 다른 응답은 버림
  const reqIdRef = useRef(0)

  const hasPendingChanges = baths !== lastApplied.baths || guests !== lastApplied.guests

  async function callApi(br: number, bt: number, gs: number) {
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/report/${token}/bedrooms-estimate?bedrooms=${br}&baths=${bt}&guests=${gs}`,
      )
      if (reqId !== reqIdRef.current) return
      if (!res.ok) throw new Error('FETCH_FAILED')
      const data = (await res.json()) as AirbnbAreaStats
      setStats(data)
      setLastApplied({ baths: bt, guests: gs })
    } catch {
      if (reqId !== reqIdRef.current) return
      setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
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
    <div className="space-y-4">
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

      {/* 결과 카드 — 로딩 중 스피너 오버레이 + opacity/pointer-events 차단 */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 size={20} className="text-[#1a56db] animate-spin" />
          </div>
        )}

        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 transition-opacity ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: '#FAFBFF' }}>
            <p className="text-[#94A3B8] mb-1" style={{ fontSize: '12px' }}>평균 객단가 (ADR)</p>
            <p className="font-black text-[#0F172A]" style={{ fontSize: '1.4rem', letterSpacing: '-0.04em', lineHeight: '1.1' }}>
              {fmtWan(stats.avgAdr)}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: '#FAFBFF' }}>
            <p className="text-[#94A3B8] mb-1" style={{ fontSize: '12px' }}>평균 월 예상 수익</p>
            <p className="font-black text-[#0F172A]" style={{ fontSize: '1.4rem', letterSpacing: '-0.04em', lineHeight: '1.1' }}>
              {fmtWan(stats.avgRevenue)}
            </p>
          </div>
        </div>

        {(stats.revenueP25 != null || stats.revenueP75 != null) && (
          <div
            className={`mt-3 rounded-[12px] border border-[#E2EAF8] px-4 py-3 transition-opacity ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
            style={{ background: '#FAFBFF' }}
          >
            <p className="text-[11px] text-[#64748B] mb-2">월 수익 구간</p>
            <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px' }}>
              {stats.revenueP25 != null && (
                <span className="rounded-[8px] bg-[#F1F5F9] px-3 py-1.5 text-[#64748B] font-medium">
                  하위 25% · {fmtWan(stats.revenueP25)} 이하
                </span>
              )}
              <span className="rounded-[8px] bg-[#EEF4FF] px-3 py-1.5 text-[#1a56db] font-bold">
                중간 · {fmtWan(stats.avgRevenue)}
              </span>
              {stats.revenueP75 != null && (
                <span className="rounded-[8px] bg-[#DCFCE7] px-3 py-1.5 text-[#15803D] font-medium">
                  상위 25% · {fmtWan(stats.revenueP75)} 이상
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#94A3B8]">
        기준월: {stats.dataMonth} · AirROI 추정값
      </p>
    </div>
  )
}
