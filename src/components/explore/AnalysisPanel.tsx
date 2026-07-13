'use client'

import { useState } from 'react'
import { X, Building2, Loader2, Search } from 'lucide-react'
import type { BuildingResult } from '@/lib/data/buildingData'
import type { AnalysisResponse } from '@/types/analysis'
import ReportSections, {
  SectionCard,
  BuildingResultCards,
} from '@/components/report/ReportSections'

// Phase 2-2D — /explore 인라인 리포트 패널.
// 데스크톱: 우측 사이드 패널 / 모바일: 풀스크린 바텀시트. 페이지 이동 없음.

// ─── 핀 경로 건축물대장 — 주소 직접 입력 ─────────────────────────────────────
// 핀 좌표는 오차가 있어 건축물대장 조회 입력으로 사용 금지 (PRD §1.D) —
// 사용자가 주소를 직접 입력해 기존 /api/building으로 조회한다.

function PinBuildingSection() {
  const [address, setAddress] = useState('')
  const [building, setBuilding] = useState<BuildingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup() {
    const query = address.trim()
    if (!query || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? '조회에 실패했습니다.')
      }
      setBuilding((await res.json()) as BuildingResult)
    } catch (err) {
      setBuilding(null)
      setError(err instanceof Error ? err.message : '조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="건축물대장 — 외도민 등록 가능성" icon={<Building2 size={16} className="text-[#1a56db]" />}>
      <p className="text-[12px] text-[#64748B] mb-3" style={{ lineHeight: '1.6' }}>
        지도 핀 위치는 오차가 있어 자동 조회하지 않습니다. 확인할 건물의 주소를 직접 입력해주세요.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup() }}
          placeholder="예: 서울 마포구 어울마당로 00"
          maxLength={200}
          className="flex-1 rounded-[10px] border border-[#E2EAF8] px-3 py-2 text-[13px] text-[#0F172A] bg-white focus:outline-none focus:border-[#1a56db]"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading || !address.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-[10px] bg-[#1a56db] text-white font-bold px-4 py-2 text-[13px] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          조회
        </button>
      </div>
      {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
      {building && <BuildingResultCards building={building} />}
    </SectionCard>
  )
}

// ─── 패널 본체 ────────────────────────────────────────────────────────────────

interface Props {
  analysis: AnalysisResponse
  onClose: () => void
}

export default function AnalysisPanel({ analysis, onClose }: Props) {
  const { report, data } = analysis

  return (
    <div className="absolute inset-0 z-30 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[46vw] sm:min-w-[400px] sm:max-w-[560px]">
      <div className="h-full bg-[#F0F5FF] flex flex-col shadow-[-4px_0_28px_rgba(0,0,0,0.18)]">
        {/* 헤더 */}
        <div
          className="flex-none bg-white border-b border-[#E2EAF8] px-4 py-3 flex items-center justify-between gap-3"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="min-w-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] mb-1">
              정밀 분석 리포트
            </span>
            <p className="font-black text-[#0F172A] truncate" style={{ fontSize: '15px', letterSpacing: '-0.03em' }}>
              {report.address ?? `선택 지점 반경 ${report.radiusM}m`}
            </p>
            <p className="text-[10px] text-[#94A3B8]">
              반경 {report.radiusM}m · 재열람은 크레딧이 차감되지 않습니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
          >
            <X size={16} className="text-[#64748B]" />
          </button>
        </div>

        {/* 본문 — 공유 섹션 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ReportSections
            key={analysis.reportToken}
            reportToken={analysis.reportToken}
            airbnb={data.airbnb}
            building={data.building}
            competitionCount={data.competitionCount}
            competitionRadiusM={report.radiusM}
            minbakUpdatedAt={data.minbakUpdatedAt}
            bedrooms={report.bedrooms}
            baths={report.baths}
            guests={report.guests}
            buildingSlot={report.address ? undefined : <PinBuildingSection />}
          />
        </div>
      </div>
    </div>
  )
}
