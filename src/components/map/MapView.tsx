'use client'

import { useState, useEffect } from 'react'
import { Map, MapMarker, MarkerClusterer, useKakaoLoader } from 'react-kakao-maps-sdk'
import { X, MapPin, TrendingUp, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Listing {
  id: string
  name: string
  road_address: string
  lat: number
  lng: number
}

interface AreaStats {
  available: boolean
  avgRevenue?: number
  avgOccupancy?: number
  avgAdr?: number
  dataMonth?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

const CLUSTER_STYLES = [
  {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
    borderRadius: '50%',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '44px',
    fontSize: '13px',
    fontWeight: '700',
    boxShadow: '0 4px 14px rgba(26,86,219,0.45)',
  },
  {
    width: '52px',
    height: '52px',
    background: 'linear-gradient(135deg, #1e40af, #1a56db)',
    borderRadius: '50%',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '52px',
    fontSize: '14px',
    fontWeight: '800',
    boxShadow: '0 4px 18px rgba(26,86,219,0.55)',
  },
  {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    borderRadius: '50%',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '60px',
    fontSize: '15px',
    fontWeight: '800',
    boxShadow: '0 4px 20px rgba(30,58,138,0.6)',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtWon(n: number) {
  const man = Math.round(n / 10000)
  return `${man.toLocaleString()}만원`
}

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8FAFF] border border-[#E2EAF8] p-2.5 text-center">
      <p className="text-[10px] text-[#94A3B8] mb-0.5 leading-tight">{label}</p>
      <p className="font-bold text-[#0F172A]" style={{ fontSize: '13px' }}>
        {value}
      </p>
    </div>
  )
}

interface InfoPanelProps {
  listing: Listing
  statsLoading: boolean
  stats: AreaStats | null
  onClose: () => void
}

function InfoPanel({ listing, statsLoading, stats, onClose }: InfoPanelProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 sm:left-auto sm:right-4 sm:bottom-6 sm:w-[320px]">
      <div
        className="bg-white rounded-t-[20px] sm:rounded-[18px] p-5"
        style={{ boxShadow: '0 -4px 28px rgba(0,0,0,0.14)' }}
      >
        {/* 핸들 (모바일) */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#CBD5E1]" />
        </div>

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p
              className="font-black text-[#0F172A] truncate"
              style={{ fontSize: '15px', letterSpacing: '-0.03em' }}
            >
              {listing.name}
            </p>
            <p className="text-[#64748B] mt-0.5 text-[12px] leading-snug">
              {listing.road_address}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <X size={15} className="text-[#64748B]" />
          </button>
        </div>

        {/* 공개 뱃지 */}
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: '#DCFCE7', color: '#15803D' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            영업 중 (공공데이터)
          </span>
        </div>

        {/* AirROI 동네 평균 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp size={12} className="text-[#1a56db]" />
            <span className="text-[11px] font-semibold text-[#1a56db] uppercase tracking-wide">
              주변 동네 평균 수익 (AirROI)
            </span>
          </div>

          {statsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin text-[#94A3B8]" />
              <span className="text-[12px] text-[#94A3B8]">통계 불러오는 중...</span>
            </div>
          ) : stats?.available && stats.avgRevenue !== undefined ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <StatChip label="월 평균 수익" value={fmtWon(stats.avgRevenue)} />
                <StatChip label="평균 ADR" value={stats.avgAdr !== undefined ? fmtWon(stats.avgAdr) : '-'} />
                <StatChip label="점유율" value={stats.avgOccupancy !== undefined ? fmtPct(stats.avgOccupancy) : '-'} />
              </div>
              <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                통계 가공값 ({stats.dataMonth ?? '–'} 기준). 개별 숙소 수치 아님. AirROI 추정치.
              </p>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8] py-1">
              이 지역 AirROI 데이터를 불러올 수 없습니다.
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/checkout"
          className="flex items-center justify-center gap-1.5 w-full py-[13px] rounded-[12px] text-white font-extrabold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
            boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
          }}
        >
          이 주소 정밀 리포트 보기
          <ChevronRight size={16} />
        </Link>
        <p className="text-center text-[10px] text-[#94A3B8] mt-1.5">
          9,900원 · 건축물대장 · 경쟁밀도 · 수익 시뮬레이터 포함
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MapView() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey,
    libraries: ['clusterer'],
  })

  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)

  const [selected, setSelected] = useState<Listing | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null)

  // 리스팅 로드
  useEffect(() => {
    fetch('/api/map/listings')
      .then(r => r.json())
      .then((data: unknown) => {
        setListings(Array.isArray(data) ? (data as Listing[]) : [])
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false))
  }, [])

  // 선택된 핀의 AirROI 통계 로드 (취소 처리 포함)
  useEffect(() => {
    if (!selected) return

    setStatsLoading(true)
    setAreaStats(null)

    let cancelled = false

    fetch(`/api/map/area-stats?lat=${selected.lat}&lng=${selected.lng}`)
      .then(r => r.json())
      .then((data: AreaStats) => {
        if (!cancelled) {
          setAreaStats(data)
          setStatsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAreaStats({ available: false })
          setStatsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  // ── Fallback renders ───────────────────────────────────────────────────────

  if (!appkey) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F0F5FF]">
        <div className="text-center px-4">
          <MapPin size={28} className="text-[#CBD5E1] mx-auto mb-2" />
          <p className="text-[14px] font-semibold text-[#64748B]">지도 API 키가 설정되지 않았습니다.</p>
          <p className="text-[12px] text-[#94A3B8] mt-1">NEXT_PUBLIC_KAKAO_JS_KEY 환경변수를 확인해주세요.</p>
        </div>
      </div>
    )
  }

  if (sdkError) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F0F5FF]">
        <div className="text-center px-4">
          <p className="text-[14px] font-semibold text-[#DC2626]">지도를 불러올 수 없습니다.</p>
          <p className="text-[12px] text-[#94A3B8] mt-1">잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    )
  }

  if (sdkLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F0F5FF]">
        <Loader2 size={24} className="animate-spin text-[#1a56db]" />
      </div>
    )
  }

  // ── Map render ─────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full">
      <Map
        center={SEOUL_CENTER}
        level={8}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
      >
        <MarkerClusterer
          averageCenter
          minLevel={5}
          styles={CLUSTER_STYLES}
        >
          {listings.map(listing => (
            <MapMarker
              key={listing.id}
              position={{ lat: listing.lat, lng: listing.lng }}
              onClick={() => {
                kakao.maps.event.preventMap()
                setSelected(listing)
              }}
            />
          ))}
        </MarkerClusterer>
      </Map>

      {/* 데이터 로딩 배지 */}
      {listingsLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 flex items-center gap-2 z-10"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
          <Loader2 size={13} className="animate-spin text-[#1a56db]" />
          <span className="text-[12px] text-[#64748B]">데이터 불러오는 중...</span>
        </div>
      )}

      {/* 핀 개수 배지 */}
      {!listingsLoading && listings.length > 0 && (
        <div
          className="absolute top-3 left-3 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 z-10"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
        >
          <MapPin size={12} className="text-[#1a56db]" />
          <span className="text-[12px] font-semibold text-[#0F172A]">
            서울 외도민 {listings.length.toLocaleString()}개
          </span>
        </div>
      )}

      {/* 정보 패널 */}
      {selected && (
        <InfoPanel
          listing={selected}
          statsLoading={statsLoading}
          stats={areaStats}
          onClose={() => setSelected(null)}
        />
      )}

      {/* 면책 문구 */}
      <div
        className="absolute bottom-2 left-2 right-2 sm:left-auto sm:right-3 sm:w-auto sm:bottom-3 bg-white/85 backdrop-blur-sm rounded-[8px] px-3 py-1.5 z-10"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        <p className="text-[10px] text-[#94A3B8] leading-relaxed">
          공공데이터 인허가 기준. 실제 운영 숙소 수와 다를 수 있음. 특례 사업자 미포함.
        </p>
      </div>
    </div>
  )
}
