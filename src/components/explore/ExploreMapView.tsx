'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Map, MapMarker, MarkerClusterer, Circle, CustomOverlayMap, Polygon, useKakaoLoader } from 'react-kakao-maps-sdk'
import { X, MapPin, Lock, Loader2, Home, Sparkles, Building2, Search, History } from 'lucide-react'
import { kakaoSignIn } from '@/lib/kakaoSignIn'
import { notifyCreditsChanged } from '@/lib/creditsEvent'
import AnalysisPanel from '@/components/explore/AnalysisPanel'
import MyReportsPanel from '@/components/explore/MyReportsPanel'
import { RADIUS_PRESETS, type RadiusPreset, type AnalysisResponse } from '@/types/analysis'
import dongCenters from '../../../data/seoul-mapo-dong-centers.json'
import dongBoundariesRaw from '../../../data/seoul-mapo-dong-boundaries.json'
import dongAreaRaw from '../../../data/seoul-mapo-dong-area.json'
import dongMinbakCountRaw from '../../../data/seoul-mapo-dong-minbak-count.json'
import dongDensityThresholds from '../../../data/seoul-mapo-dong-density-thresholds.json'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DongCenter {
  dong_nm: string
  adm_cd: string
  adm_cd2: string
  lat: number
  lng: number
}

interface DongBoundaryFeature {
  properties: { dong_nm: string; adm_cd: string }
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

const dongBoundaries = dongBoundariesRaw as unknown as {
  type: 'FeatureCollection'
  features: DongBoundaryFeature[]
}

// ─── Static lookup maps (built once at module load) ───────────────────────────

const areaMap: Record<string, number> = {}
for (const d of dongAreaRaw as Array<{ dong_nm: string; area_sqkm: number }>) {
  areaMap[d.dong_nm] = d.area_sqkm
}

const countMap: Record<string, number> = {}
const fetchedAtMap: Record<string, string> = {}
for (const d of dongMinbakCountRaw as Array<{ dong_nm: string; count: number | null; fetched_at: string }>) {
  if (d.count !== null) countMap[d.dong_nm] = d.count
  fetchedAtMap[d.dong_nm] = d.fetched_at
}

// density = count / area_sqkm (개/㎢), 소수점 1자리
function getDongDensity(dong_nm: string): number | null {
  const count = countMap[dong_nm]
  const area = areaMap[dong_nm]
  if (count === undefined || area === undefined || area === 0) return null
  return Math.round((count / area) * 10) / 10
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPO_CENTER = { lat: 37.556, lng: 126.921 }

// 에어비앤비 핀 (Phase 2-2C/D — 유료 레이어, 위치만 노출)
interface AirbnbPin {
  id: string
  lat: number
  lng: number
  bedrooms: number | null
}

type PinLayerStatus = 'off' | 'loading' | 'on' | 'unauthed' | 'forbidden' | 'error'

// 분석 대상 지점 (Phase 2-2G) — 어느 경로로 선택하든 동일한 반경 선택 → 분석 흐름.
// address는 주소가 신뢰 가능한 경로(주소 검색·외도민 핀)에서만 채움 —
// 에어비앤비 핀 좌표는 오차가 있어 건축물대장 입력 금지(PRD §1.D), 지도 클릭은 주소 미상.
interface AnalysisTarget {
  lat: number
  lng: number
  address: string | null
  label: string
  source: 'map' | 'search' | 'minbak' | 'airbnb'
}

// 분석 버튼 게이트 — 서버(RPC)가 최종 방어선, 프론트는 안내 목적(PRD §1.A)
type AnalysisGate = 'checking' | 'unauthed' | 'zero' | 'ready'

// 로즈 도트 마커 (개별 숙소 특정 정보 없음 — 위치 점만)
const AIRBNB_PIN_IMAGE = {
  src:
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="#FF385C" stroke="#fff" stroke-width="1.5"/></svg>',
    ),
  size: { width: 14, height: 14 },
}

// 외도민 개별 핀 (무료 레이어 — 공공데이터 인허가, 상호·주소만 노출)
interface MinbakPin {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

type MinbakLayerStatus = 'off' | 'loading' | 'on' | 'error'

// 블루 도트 마커 — 에어비앤비(로즈)와 색으로 구분
const MINBAK_PIN_IMAGE = {
  src:
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="#1a56db" stroke="#fff" stroke-width="1.5"/></svg>',
    ),
  size: { width: 14, height: 14 },
}

// 외도민 클러스터 — 기본 스타일(에어비앤비 클러스터)과 구분되는 블루 계열.
// calculator 구간 [10, 100, 500] → 4구간이라 styles도 4개 필수 (부족하면 스타일 미적용)
const MINBAK_CLUSTER_CALCULATOR = [10, 100, 500]
const MINBAK_CLUSTER_STYLES = [
  {
    width: '36px', height: '36px', background: 'rgba(26,86,219,0.85)', borderRadius: '50%',
    color: '#fff', textAlign: 'center', lineHeight: '36px', fontSize: '12px', fontWeight: '700',
    boxShadow: '0 3px 10px rgba(26,86,219,0.4)',
  },
  {
    width: '44px', height: '44px', background: 'rgba(26,86,219,0.9)', borderRadius: '50%',
    color: '#fff', textAlign: 'center', lineHeight: '44px', fontSize: '13px', fontWeight: '700',
    boxShadow: '0 4px 14px rgba(26,86,219,0.45)',
  },
  {
    width: '52px', height: '52px', background: 'rgba(30,64,175,0.92)', borderRadius: '50%',
    color: '#fff', textAlign: 'center', lineHeight: '52px', fontSize: '14px', fontWeight: '800',
    boxShadow: '0 4px 18px rgba(26,86,219,0.55)',
  },
  {
    width: '60px', height: '60px', background: 'rgba(30,58,138,0.95)', borderRadius: '50%',
    color: '#fff', textAlign: 'center', lineHeight: '60px', fontSize: '15px', fontWeight: '800',
    boxShadow: '0 4px 20px rgba(30,58,138,0.6)',
  },
]

function fmtRadius(m: number) {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 임계값은 fetch-dong-minbak-count.ts 재실행 시 equal-thirds로 자동 재산정됨
// 타 구 확장 시 해당 구 데이터로 스크립트 재실행만 하면 됨
const { low_threshold: DENSITY_LOW, high_threshold: DENSITY_HIGH } =
  dongDensityThresholds as { low_threshold: number; high_threshold: number }

function getMapoCompLabel(density: number): {
  label: string
  badgeCls: string
  numColor: string
  dotColor: string
} {
  if (density >= DENSITY_HIGH) {
    return {
      label: '경쟁 치열',
      badgeCls: 'bg-[#FEE2E2] text-[#DC2626]',
      numColor: '#DC2626',
      dotColor: '#DC2626',
    }
  }
  if (density >= DENSITY_LOW) {
    return {
      label: '경쟁 보통',
      badgeCls: 'bg-[#FEF3C7] text-[#D97706]',
      numColor: '#D97706',
      dotColor: '#D97706',
    }
  }
  return {
    label: '경쟁 여유',
    badgeCls: 'bg-[#DCFCE7] text-[#15803D]',
    numColor: '#15803D',
    dotColor: '#15803D',
  }
}

// GeoJSON MultiPolygon 첫 polygon 첫 ring → Kakao path 변환
// [lng, lat] → { lat, lng } 순서 변환
function geojsonRingToPath(coordinates: number[][][][]): Array<{ lat: number; lng: number }> {
  return coordinates[0][0].map(([lng, lat]) => ({ lat, lng }))
}

// 경쟁등급 → 폴리곤 채우기 색 (getMapoCompLabel 뱃지 색상과 동일)
function getDensityColor(density: number | null): { fill: string; stroke: string } {
  if (density === null) return { fill: '#CBD5E1', stroke: '#94A3B8' }
  if (density >= DENSITY_HIGH) return { fill: '#DC2626', stroke: '#991B1B' }
  if (density >= DENSITY_LOW)  return { fill: '#D97706', stroke: '#92400E' }
  return { fill: '#15803D', stroke: '#14532D' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DongPin({
  dong,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  dong: DongCenter
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer select-none transition-all',
        isSelected
          ? 'text-white shadow-lg scale-105'
          : 'bg-white text-[#1a56db] border border-[#BDD0F5] hover:bg-[#EEF4FF] shadow-sm hover:shadow-md',
      ].join(' ')}
      style={
        isSelected
          ? { background: 'linear-gradient(135deg, #1a56db, #0ea5e9)', whiteSpace: 'nowrap' }
          : { whiteSpace: 'nowrap' }
      }
    >
      <MapPin size={10} className={isSelected ? 'text-white' : 'text-[#1a56db]'} />
      <span className="text-[12px] font-bold">{dong.dong_nm}</span>
    </div>
  )
}

function LockedSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Lock size={11} className="text-[#94A3B8]" />
        <span className="text-[11px] font-semibold text-[#94A3B8]">{label}</span>
      </div>
      <div className="relative rounded-[10px] border border-[#E2EAF8] bg-[#F8FAFF] p-3 overflow-hidden">
        <div className="blur-[5px] select-none pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-[10px]">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F1F5F9] border border-[#E2EAF8] text-[11px] font-semibold text-[#64748B]">
            <Lock size={10} />
            결제 후 공개
          </span>
        </div>
      </div>
    </div>
  )
}

interface DongPanelProps {
  dong: DongCenter
  onClose: () => void
  onCta: () => void
  ctaLoading: boolean
}

function DongPanel({ dong, onClose, onCta, ctaLoading }: DongPanelProps) {
  const density = getDongDensity(dong.dong_nm)
  const count = countMap[dong.dong_nm] ?? null
  const fetchedAt = fetchedAtMap[dong.dong_nm] ?? ''
  const compInfo = density !== null ? getMapoCompLabel(density) : null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 sm:right-auto sm:top-0 sm:w-[28vw] sm:min-w-[340px] sm:max-w-[440px]">
      <div
        className="bg-white rounded-t-[20px] sm:rounded-none p-5 sm:p-6 max-h-[72dvh] sm:max-h-none sm:h-full overflow-y-auto shadow-[0_-4px_28px_rgba(0,0,0,0.14)] sm:shadow-[4px_0_28px_rgba(0,0,0,0.14)]"
      >
        {/* 핸들 (모바일 전용) */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#CBD5E1]" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#1a56db] flex-shrink-0" />
            <h2
              className="font-black text-[#0F172A]"
              style={{ fontSize: '20px', letterSpacing: '-0.03em' }}
            >
              {dong.dong_nm}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
          >
            <X size={15} className="text-[#64748B]" />
          </button>
        </div>

        {/* 경쟁밀도 (면적당) — 무료 */}
        <div className="bg-[#F8FAFF] rounded-[12px] border border-[#E2EAF8] p-4 mb-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-[11px] font-bold text-[#1a56db] uppercase tracking-wide">
              경쟁밀도 (면적당)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-semibold">
              무료
            </span>
          </div>

          {density !== null && compInfo ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  {count === 0 ? (
                    <span
                      className="font-semibold"
                      style={{ fontSize: '14px', color: compInfo.numColor, lineHeight: 1.4 }}
                    >
                      반경 500m 내 인허가 외도민 0건
                    </span>
                  ) : (
                    <>
                      <span
                        className="font-black"
                        style={{
                          fontSize: '26px',
                          letterSpacing: '-0.04em',
                          color: compInfo.numColor,
                          lineHeight: 1,
                        }}
                      >
                        {density.toFixed(1)}
                      </span>
                      <span className="text-[13px] text-[#64748B] ml-1.5">개/㎢</span>
                    </>
                  )}
                </div>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${compInfo.badgeCls}`}>
                  {compInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                {count === 0
                  ? '경쟁 없는 지역 · 반경 500m 기준'
                  : `외도민 ${count}개 · 반경 500m 기준`}
              </p>
              <p className="text-[9px] text-[#94A3B8] mt-0.5">
                공공데이터 외국인관광도시민박업 인허가 · {fetchedAt} 기준
              </p>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8] py-0.5">데이터를 불러올 수 없습니다.</p>
          )}
        </div>

        <div className="border-t border-[#E2EAF8] my-3" />

        {/* 에어비앤비 수익 통계 — 잠금 */}
        <div className="mb-4">
          <LockedSection label="에어비앤비 수익 통계">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-[#94A3B8]">예약률</p>
                <p className="text-[15px] font-black text-[#0F172A]">--%</p>
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">객단가</p>
                <p className="text-[15px] font-black text-[#0F172A]">--만원</p>
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">월 평균</p>
                <p className="text-[15px] font-black text-[#0F172A]">--만원</p>
              </div>
            </div>
          </LockedSection>
        </div>

        {/* CTA — 잔액 있으면 지도 이동 안내, 없으면 결제 페이지 (ExploreMapView.handleDongCta) */}
        <button
          type="button"
          onClick={onCta}
          disabled={ctaLoading}
          className="w-full py-[14px] rounded-[12px] text-white font-extrabold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
            boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
          }}
        >
          {ctaLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              확인 중...
            </>
          ) : (
            `${dong.dong_nm} 매물 주소 입력하고 정밀 분석받기`
          )}
        </button>
        <p className="text-center text-[10px] text-[#94A3B8] mt-1.5">
          종합 입지 점수 · AirROI 수익 통계 · 건축물대장 포함
        </p>
      </div>
    </div>
  )
}

// ─── 에어비앤비 핀 레이어 컨트롤 (Phase 2-2D) ─────────────────────────────────

function PinLoginCard({
  message = '에어비앤비 매물 핀은 회원 전용입니다. 가입 시 무료 분석 1회가 지급됩니다.',
  bare = false,
}: {
  message?: string
  /** true면 카드 껍데기 없이 내용만 렌더 (RadiusControl 내부 삽입용) */
  bare?: boolean
}) {
  const content = (
    <>
      <p className="text-[12px] font-bold text-[#0F172A] mb-1">로그인이 필요합니다</p>
      <p className="text-[11px] text-[#64748B] mb-2.5" style={{ lineHeight: 1.5 }}>
        {message}
      </p>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void kakaoSignIn()}
          className="w-full rounded-[10px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] px-2.5 py-1.5 text-[12px] font-bold text-[#1a56db]"
        >
          카카오 로그인
        </button>
      </div>
    </>
  )

  if (bare) return <div>{content}</div>

  return (
    <div
      className="rounded-xl bg-white px-3.5 py-3 w-[220px]"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
    >
      {content}
    </div>
  )
}

// ─── 주소 검색 (Phase 2-2G) — 카카오 지오코더(services 라이브러리) ─────────────

function AddressSearchBar({
  onFound,
}: {
  onFound: (r: { lat: number; lng: number; address: string }) => void
}) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function search() {
    const q = query.trim()
    if (!q || searching) return
    if (!window.kakao?.maps?.services) {
      setError('주소 검색을 사용할 수 없습니다. 새로고침 후 다시 시도해주세요.')
      return
    }
    setSearching(true)
    setError(null)
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.addressSearch(q, (result, status) => {
      setSearching(false)
      if (status !== kakao.maps.services.Status.OK || result.length === 0) {
        setError(
          status === kakao.maps.services.Status.ZERO_RESULT
            ? '검색 결과가 없습니다. 도로명 또는 지번 주소로 입력해주세요.'
            : '주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.',
        )
        return
      }
      const top = result[0]
      const lat = Number(top.y)
      const lng = Number(top.x)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setError('주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      onFound({ lat, lng, address: top.address_name })
    })
  }

  return (
    <div className="absolute top-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[400px] z-10">
      <div
        className="rounded-[12px] bg-white flex items-center gap-1 pl-3 pr-1.5 py-1.5"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
      >
        <Search size={14} className="text-[#94A3B8] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') search() }}
          placeholder="주소로 분석 시작 (예: 마포구 어울마당로 00)"
          maxLength={200}
          className="flex-1 min-w-0 text-[13px] text-[#0F172A] placeholder:text-[#9CA3AF] bg-transparent focus:outline-none py-1"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-[9px] bg-[#1a56db] text-white text-[12px] font-bold px-3 py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1"
        >
          {searching ? <Loader2 size={12} className="animate-spin" /> : '검색'}
        </button>
      </div>
      {error && (
        <div
          className="mt-1.5 rounded-[10px] bg-white px-3 py-2 text-[11px] text-[#B91C1C]"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

interface RadiusControlProps {
  target: AnalysisTarget
  radiusM: RadiusPreset
  onRadiusChange: (r: RadiusPreset) => void
  gate: AnalysisGate
  balance: number | null
  analyzing: boolean
  error: { msg: string; insufficient?: boolean } | null
  onAnalyze: () => void
  onClose: () => void
}

function RadiusControl({
  target,
  radiusM,
  onRadiusChange,
  gate,
  balance,
  analyzing,
  error,
  onAnalyze,
  onClose,
}: RadiusControlProps) {
  // 실수 차감 방지 2단 확인 — 첫 클릭은 확인 단계, 두 번째 클릭이 실제 차감(PRD §1.A 안내 목적)
  const [confirming, setConfirming] = useState(false)

  function handleRadiusChange(r: RadiusPreset) {
    setConfirming(false) // 반경이 바뀌면 확인 단계 리셋
    onRadiusChange(r)
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] max-w-[380px]">
      <div
        className="rounded-[16px] bg-white p-4"
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#0F172A] truncate">{target.label}</p>
            <p className="text-[10px] text-[#94A3B8]">분석 반경을 선택하세요</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors shrink-0"
          >
            <X size={13} className="text-[#64748B]" />
          </button>
        </div>

        <div className="flex gap-1.5 mb-3">
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRadiusChange(r)}
              disabled={analyzing}
              className={[
                'flex-1 rounded-[9px] py-1.5 text-[12px] font-bold border transition-colors',
                radiusM === r
                  ? 'bg-[#1a56db] text-white border-[#1a56db]'
                  : 'bg-white text-[#64748B] border-[#E2EAF8] hover:border-[#1a56db] hover:text-[#1a56db]',
              ].join(' ')}
            >
              {fmtRadius(r)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-2.5 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2">
            <p className="text-[12px] text-[#B91C1C]">{error.msg}</p>
            {error.insufficient && (
              <div className="flex gap-3 mt-1">
                <Link href="/checkout" className="text-[12px] font-bold text-[#1a56db] underline">
                  크레딧 충전하기 →
                </Link>
                <Link href="/pricing" className="text-[12px] font-semibold text-[#64748B] underline">
                  요금제 보기
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 크레딧 상태별 분기 — 서버(RPC)가 최종 게이트, 여기는 안내 목적 */}
        {gate === 'unauthed' ? (
          <PinLoginCard
            bare
            message="분석 리포트는 로그인 후 이용할 수 있습니다. 가입 시 무료 분석 1회가 지급됩니다."
          />
        ) : gate === 'zero' ? (
          <div>
            <p className="text-[12px] font-bold text-[#0F172A] mb-1">크레딧이 없습니다</p>
            <p className="text-[11px] text-[#64748B] mb-2.5" style={{ lineHeight: 1.5 }}>
              분석 1회당 크레딧 1개가 사용됩니다. 충전 후 이용해주세요.
            </p>
            <div className="flex gap-1.5">
              <Link
                href="/checkout"
                className="flex-1 rounded-[10px] py-2 text-center text-[12px] font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #1a56db, #0ea5e9)' }}
              >
                크레딧 충전하기
              </Link>
              <Link
                href="/pricing"
                className="flex-1 rounded-[10px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] py-2 text-center text-[12px] font-bold text-[#1a56db]"
              >
                요금제 보기
              </Link>
            </div>
          </div>
        ) : confirming && !analyzing ? (
          <div>
            <p className="text-[12px] text-[#0F172A] mb-2 text-center">
              <strong>크레딧 1개</strong>를 사용해 반경 {fmtRadius(radiusM)} 분석을 실행할까요?
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-[10px] border border-[#E2EAF8] bg-white py-[10px] text-[13px] font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onAnalyze}
                className="flex-[2] rounded-[10px] py-[10px] text-white font-extrabold text-[13px] hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
                  boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
                }}
              >
                <Sparkles size={14} />
                차감하고 분석 실행
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={analyzing || gate === 'checking'}
            className="w-full py-[12px] rounded-[12px] text-white font-extrabold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
              boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
            }}
          >
            {analyzing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                분석 중...
              </>
            ) : gate === 'checking' ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                크레딧 확인 중...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                이 위치 분석하기 (크레딧 1회 차감)
              </>
            )}
          </button>
        )}

        {(gate === 'ready' || gate === 'checking') && (
          <p className="text-center text-[10px] text-[#94A3B8] mt-1.5">
            크레딧 1개가 차감됩니다 · 재열람 무료
            {balance !== null && (
              <span className="ml-1 font-semibold text-[#64748B]">(보유 {balance}회)</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExploreMapView() {
  const router = useRouter()
  const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''
  // services: 주소 검색 지오코더 (Phase 2-2G)
  const [sdkLoading, sdkError] = useKakaoLoader({ appkey, libraries: ['clusterer', 'services'] })

  const [selectedDong, setSelectedDong] = useState<DongCenter | null>(null)
  const [hoveredAdmCd, setHoveredAdmCd] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState(MAPO_CENTER)
  const [mapLevel, setMapLevel] = useState(7)
  const [dongCtaLoading, setDongCtaLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 에어비앤비 핀 레이어 (Phase 2-2D)
  const [pinStatus, setPinStatus] = useState<PinLayerStatus>('off')
  const [pins, setPins] = useState<AirbnbPin[]>([])
  const [pinsFetchedAt, setPinsFetchedAt] = useState<string | null>(null)
  // 분석 대상 지점 (Phase 2-2G) — 지도 클릭·주소 검색·외도민 핀·에어비앤비 핀 공통
  const [target, setTarget] = useState<AnalysisTarget | null>(null)
  const [gate, setGate] = useState<AnalysisGate>('checking')
  const gateReqIdRef = useRef(0)
  const [radiusM, setRadiusM] = useState<RadiusPreset>(500)
  const [balance, setBalance] = useState<number | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<{ msg: string; insufficient?: boolean } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [showReports, setShowReports] = useState(false)

  // 외도민 개별 핀 레이어 — 무료(게이트 없음), 기본 ON. 에어비앤비 레이어와 독립 동작
  const [minbakStatus, setMinbakStatus] = useState<MinbakLayerStatus>('loading')
  const [minbakPins, setMinbakPins] = useState<MinbakPin[]>([])
  const [minbakUpdatedAt, setMinbakUpdatedAt] = useState<string | null>(null)
  const [selectedMinbak, setSelectedMinbak] = useState<MinbakPin | null>(null)

  const loadMinbakPins = useCallback(async () => {
    setMinbakStatus('loading')
    try {
      const res = await fetch('/api/map/minbak-pins')
      if (!res.ok) {
        setMinbakStatus('error')
        return
      }
      const data = (await res.json()) as { pins: MinbakPin[]; updatedAt: string | null }
      setMinbakPins(data.pins)
      setMinbakUpdatedAt(data.updatedAt)
      setMinbakStatus('on')
    } catch {
      setMinbakStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadMinbakPins()
  }, [loadMinbakPins])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // 분석 대상 선택 — 어느 트리거든 이 함수를 거쳐 동일한 반경 선택 흐름으로 합류
  const selectTarget = useCallback((t: AnalysisTarget) => {
    setTarget(t)
    setAnalysisError(null)
    setSelectedDong(null)
    setSelectedMinbak(null)
    setShowReports(false)
  }, [])

  // 대상 선택 시 크레딧 상태 조회 — 프론트 안내용 분기(서버 RPC가 최종 게이트)
  useEffect(() => {
    if (!target) return
    const reqId = ++gateReqIdRef.current
    setGate('checking')
    ;(async () => {
      try {
        const res = await fetch('/api/credits/balance')
        if (reqId !== gateReqIdRef.current) return
        if (res.status === 401) {
          setGate('unauthed')
          return
        }
        if (!res.ok) {
          // 조회 실패 — 서버가 어차피 재검증하므로 진행 허용
          setGate('ready')
          return
        }
        const data = (await res.json()) as { balance?: number }
        const bal = typeof data.balance === 'number' ? data.balance : 0
        setBalance(bal)
        notifyCreditsChanged(bal)
        setGate(bal > 0 ? 'ready' : 'zero')
      } catch {
        if (reqId === gateReqIdRef.current) setGate('ready')
      }
    })()
  }, [target])

  // 동 패널 CTA — 잔액 있으면 결제 없이 지도를 동 중심으로 이동, 없으면(비로그인 포함) 결제 페이지로.
  // dong 쿼리는 /checkout에서 표시 전용으로만 쓰임(주소 입력 placeholder) — 여기서도 동일하게 유지.
  async function handleDongCta(dong: DongCenter) {
    if (dongCtaLoading) return
    setDongCtaLoading(true)
    try {
      const res = await fetch('/api/credits/balance')
      if (res.ok) {
        const data = (await res.json()) as { balance?: number }
        const bal = typeof data.balance === 'number' ? data.balance : 0
        if (bal > 0) {
          setBalance(bal)
          notifyCreditsChanged(bal)
          setSelectedDong(null)
          setMapLevel(4)
          setMapCenter({ lat: dong.lat, lng: dong.lng })
          setToast(`${dong.dong_nm} 지도로 이동했어요 · 원하는 지점을 클릭해 분석해보세요`)
          return
        }
      }
      // 비로그인(401) 또는 잔액 0 → 기존대로 결제 페이지
      router.push(`/checkout?dong=${encodeURIComponent(dong.dong_nm)}`)
    } finally {
      setDongCtaLoading(false)
    }
  }

  function toggleMinbakLayer() {
    if (minbakStatus === 'loading') return
    if (minbakStatus === 'on') {
      setMinbakStatus('off')
      setSelectedMinbak(null)
      return
    }
    if (minbakPins.length > 0) {
      setMinbakStatus('on')
      return
    }
    void loadMinbakPins() // error 상태에서 재시도
  }

  async function refreshBalance() {
    try {
      const res = await fetch('/api/credits/balance')
      if (!res.ok) return
      const data = (await res.json()) as { balance?: number }
      if (typeof data.balance === 'number') {
        setBalance(data.balance)
        notifyCreditsChanged(data.balance)
      }
    } catch {
      // 잔액 표시는 부가 정보 — 실패해도 무시
    }
  }

  async function togglePinLayer() {
    if (pinStatus === 'loading') return
    if (pinStatus === 'on') {
      setPinStatus('off')
      return
    }
    // off/unauthed/forbidden/error → 재시도
    if (pins.length > 0) {
      setPinStatus('on')
      return
    }
    setPinStatus('loading')
    try {
      const res = await fetch('/api/map/airbnb-pins')
      if (res.status === 401) {
        setPinStatus('unauthed')
        return
      }
      if (res.status === 403) {
        setPinStatus('forbidden')
        return
      }
      if (!res.ok) {
        setPinStatus('error')
        return
      }
      const data = (await res.json()) as { pins: AirbnbPin[]; fetchedAt: string | null }
      setPins(data.pins)
      setPinsFetchedAt(data.fetchedAt)
      setPinStatus('on')
      void refreshBalance()
    } catch {
      setPinStatus('error')
    }
  }

  async function runAnalysis() {
    if (!target || analyzing) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: target.lat,
          lng: target.lng,
          radiusM,
          // 주소가 신뢰 가능한 경로(주소 검색·외도민 핀)만 전달 — 건축물대장 자동 조회
          ...(target.address ? { address: target.address } : {}),
        }),
      })
      const body = (await res.json().catch(() => null)) as
        | (AnalysisResponse & { error?: string })
        | null
      if (!res.ok || !body) {
        setAnalysisError({
          msg: body?.error ?? '분석 실행에 실패했습니다. 잠시 후 다시 시도해주세요.',
          insufficient: res.status === 402,
        })
        return
      }
      setAnalysis(body)
      if (typeof body.balance === 'number') {
        setBalance(body.balance)
        notifyCreditsChanged(body.balance)
      }
      setTarget(null)
    } catch {
      setAnalysisError({ msg: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setAnalyzing(false)
    }
  }

  if (!appkey) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F0F5FF]">
        <div className="text-center px-4">
          <MapPin size={28} className="text-[#CBD5E1] mx-auto mb-2" />
          <p className="text-[14px] font-semibold text-[#64748B]">
            지도 API 키가 설정되지 않았습니다.
          </p>
          <p className="text-[12px] text-[#94A3B8] mt-1">
            NEXT_PUBLIC_KAKAO_JS_KEY 환경변수를 확인해주세요.
          </p>
        </div>
      </div>
    )
  }

  if (sdkError) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F0F5FF]">
        <p className="text-[14px] font-semibold text-[#DC2626]">지도를 불러올 수 없습니다.</p>
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

  return (
    <div className="relative h-full w-full">
      <Map
        center={mapCenter}
        level={mapLevel}
        isPanto
        style={{ width: '100%', height: '100%' }}
        onClick={(_, mouseEvent) => {
          // 지도 임의 지점 클릭 = 분석 대상 선택 (Phase 2-2G — 핀 없이도 분석 가능)
          if (analysis) return
          selectTarget({
            lat: mouseEvent.latLng.getLat(),
            lng: mouseEvent.latLng.getLng(),
            address: null,
            label: '지도에서 선택한 지점',
            source: 'map',
          })
        }}
      >
        {/* 동 경계선 — 핀보다 먼저 렌더링해 아래 레이어로 배치
            경쟁등급(치열/보통/여유)을 색으로 표현, 패널 뱃지 색상과 통일 */}
        {dongBoundaries.features.map((feature) => {
          const { fill, stroke } = getDensityColor(getDongDensity(feature.properties.dong_nm))
          const isHighlighted =
            selectedDong?.adm_cd === feature.properties.adm_cd ||
            hoveredAdmCd === feature.properties.adm_cd
          return (
            <Polygon
              key={feature.properties.adm_cd}
              path={geojsonRingToPath(feature.geometry.coordinates)}
              strokeColor={stroke}
              strokeOpacity={isHighlighted ? 1 : 0.55}
              strokeWeight={isHighlighted ? 4 : 2.5}
              fillColor={fill}
              fillOpacity={isHighlighted ? 0.40 : 0.22}
              onMouseover={() => setHoveredAdmCd(feature.properties.adm_cd)}
              onMouseout={() => setHoveredAdmCd(null)}
            />
          )
        })}

        {(dongCenters as DongCenter[]).map((dong) => (
          <CustomOverlayMap
            key={dong.adm_cd}
            position={{ lat: dong.lat, lng: dong.lng }}
            yAnchor={1.2}
          >
            <DongPin
              dong={dong}
              isSelected={selectedDong?.adm_cd === dong.adm_cd}
              onClick={() => {
                setSelectedDong(dong)
                setTarget(null)
                setSelectedMinbak(null)
              }}
              onMouseEnter={() => setHoveredAdmCd(dong.adm_cd)}
              onMouseLeave={() => setHoveredAdmCd(null)}
            />
          </CustomOverlayMap>
        ))}

        {/* 외도민 개별 핀 — 무료 레이어 (공공데이터 인허가, 상호·주소만)
            블루 도트 + 블루 클러스터로 에어비앤비(로즈)와 구분 */}
        {minbakStatus === 'on' && (
          <MarkerClusterer
            averageCenter
            minLevel={4}
            calculator={MINBAK_CLUSTER_CALCULATOR}
            styles={MINBAK_CLUSTER_STYLES}
          >
            {minbakPins.map((pin) => (
              <MapMarker
                key={pin.id}
                position={{ lat: pin.lat, lng: pin.lng }}
                image={MINBAK_PIN_IMAGE}
                onClick={() => {
                  setSelectedMinbak(pin)
                  setSelectedDong(null)
                  setTarget(null)
                }}
              />
            ))}
          </MarkerClusterer>
        )}

        {/* 에어비앤비 매물 핀 — 유료 레이어 (위치 점만, 개별 정보 없음)
            줌아웃 시 클러스터링(레벨 4+), 줌인하면 개별 핀 클릭 가능 */}
        {pinStatus === 'on' && (
          <MarkerClusterer averageCenter minLevel={4}>
            {pins.map((pin) => (
              <MapMarker
                key={pin.id}
                position={{ lat: pin.lat, lng: pin.lng }}
                image={AIRBNB_PIN_IMAGE}
                onClick={() => {
                  // 핀 좌표는 오차가 있어 주소는 전달하지 않음 (건축물대장은 패널에서 직접 입력)
                  selectTarget({
                    lat: pin.lat,
                    lng: pin.lng,
                    address: null,
                    label: '에어비앤비 매물 주변',
                    source: 'airbnb',
                  })
                }}
              />
            ))}
          </MarkerClusterer>
        )}

        {/* 선택 지점 반경 원형 오버레이 + 십자선 마커 — "여기를 분석한다" 표시 */}
        {target && !analysis && (
          <>
            <Circle
              center={{ lat: target.lat, lng: target.lng }}
              radius={radiusM}
              strokeWeight={2}
              strokeColor="#1a56db"
              strokeOpacity={0.9}
              fillColor="#1a56db"
              fillOpacity={0.12}
            />
            <CustomOverlayMap position={{ lat: target.lat, lng: target.lng }} zIndex={4}>
              <div
                className="flex items-center justify-center rounded-full pointer-events-none"
                style={{
                  width: '26px',
                  height: '26px',
                  border: '2.5px solid #1a56db',
                  background: 'rgba(26,86,219,0.15)',
                  boxShadow: '0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                <span
                  className="rounded-full"
                  style={{ width: '7px', height: '7px', background: '#1a56db' }}
                />
              </div>
            </CustomOverlayMap>
          </>
        )}

        {/* 외도민 핀 인포 버블 — 상호·주소만 (공공데이터 노출 정책 준수, 수익 통계 없음) */}
        {selectedMinbak && (
          <CustomOverlayMap
            position={{ lat: selectedMinbak.lat, lng: selectedMinbak.lng }}
            yAnchor={1.25}
            zIndex={3}
          >
            <div
              className="relative bg-white rounded-xl px-3.5 py-3 w-[240px]"
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}
            >
              <button
                type="button"
                onClick={() => setSelectedMinbak(null)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
              >
                <X size={11} className="text-[#64748B]" />
              </button>
              <p
                className="text-[13px] font-black text-[#0F172A] pr-5 mb-1"
                style={{ letterSpacing: '-0.02em' }}
              >
                {selectedMinbak.name}
              </p>
              <p className="text-[11px] text-[#64748B]" style={{ lineHeight: 1.5 }}>
                {selectedMinbak.address}
              </p>
              <p className="text-[9px] text-[#94A3B8] mt-1.5">
                외국인관광도시민박업 인허가 · 공공데이터
                {minbakUpdatedAt ? ` · ${minbakUpdatedAt} 기준` : ''}
              </p>
              {/* Phase 2-2G — 외도민 핀에서도 동일한 반경 선택 → 분석 흐름 진입.
                  공공데이터 주소라 건축물대장 자동 조회에도 사용 가능 */}
              <button
                type="button"
                onClick={() =>
                  selectTarget({
                    lat: selectedMinbak.lat,
                    lng: selectedMinbak.lng,
                    address: selectedMinbak.address,
                    label: selectedMinbak.name,
                    source: 'minbak',
                  })
                }
                className="mt-2.5 w-full rounded-[9px] py-1.5 text-[12px] font-extrabold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(135deg, #1a56db, #0ea5e9)' }}
              >
                <Sparkles size={11} />
                이 위치 분석하기
              </button>
            </div>
          </CustomOverlayMap>
        )}
      </Map>

      {/* 주소 검색 — 어디서든 주소로 분석 시작 (Phase 2-2G) */}
      <AddressSearchBar
        onFound={({ lat, lng, address }) => {
          setMapCenter({ lat, lng })
          setMapLevel(3)
          selectTarget({ lat, lng, address, label: address, source: 'search' })
        }}
      />

      {/* 동 개수 배지 — 모바일은 검색바 아래로 */}
      <div
        className="absolute top-[58px] left-3 sm:top-3 sm:left-auto sm:right-3 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 z-10"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
      >
        <MapPin size={12} className="text-[#1a56db]" />
        <span className="text-[12px] font-semibold text-[#0F172A]">
          마포구 {(dongCenters as DongCenter[]).length}개 동
        </span>
      </div>

      {/* 매물 핀 레이어 토글 — 외도민(무료, 기본 ON)·에어비앤비(회원 전용, Phase 2-2D)
          각 레이어는 독립적으로 켜고 끌 수 있음 */}
      <div className="absolute top-[58px] left-3 sm:top-14 sm:left-auto sm:right-3 z-10 flex flex-col items-start sm:items-end gap-2 mt-10 sm:mt-0">
        <button
          type="button"
          onClick={toggleMinbakLayer}
          className={[
            'rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors',
            minbakStatus === 'on'
              ? 'bg-[#1a56db] text-white'
              : 'bg-white text-[#0F172A] hover:bg-[#EEF4FF]',
          ].join(' ')}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
        >
          {minbakStatus === 'loading' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Building2
              size={12}
              className={minbakStatus === 'on' ? 'text-white' : 'text-[#1a56db]'}
            />
          )}
          <span className="text-[12px] font-semibold">외도민 숙소</span>
          {minbakStatus === 'on' && (
            <span className="text-[10px] font-bold bg-white/25 rounded-full px-1.5 py-0.5">
              {minbakPins.length.toLocaleString('ko-KR')}
            </span>
          )}
        </button>

        {minbakStatus === 'error' && (
          <div
            className="rounded-xl bg-white px-3.5 py-2.5 w-[220px]"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
          >
            <p className="text-[11px] text-[#64748B]" style={{ lineHeight: 1.5 }}>
              외도민 데이터를 불러오지 못했습니다. 버튼을 눌러 다시 시도해주세요.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={togglePinLayer}
          className={[
            'rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors',
            pinStatus === 'on'
              ? 'bg-[#FF385C] text-white'
              : 'bg-white text-[#0F172A] hover:bg-[#FFF1F3]',
          ].join(' ')}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
        >
          {pinStatus === 'loading' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Home size={12} className={pinStatus === 'on' ? 'text-white' : 'text-[#FF385C]'} />
          )}
          <span className="text-[12px] font-semibold">에어비앤비 매물</span>
          {pinStatus === 'on' && (
            <span className="text-[10px] font-bold bg-white/25 rounded-full px-1.5 py-0.5">
              {pins.length.toLocaleString('ko-KR')}
            </span>
          )}
        </button>

        {pinStatus === 'on' && pinsFetchedAt && (
          <span
            className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] text-[#64748B]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          >
            {pinsFetchedAt} 기준 · 위치는 근사값입니다
          </span>
        )}

        {pinStatus === 'unauthed' && <PinLoginCard />}

        {(pinStatus === 'forbidden' || pinStatus === 'error') && (
          <div
            className="rounded-xl bg-white px-3.5 py-2.5 w-[220px]"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
          >
            <p className="text-[11px] text-[#64748B]" style={{ lineHeight: 1.5 }}>
              {pinStatus === 'forbidden'
                ? '크레딧 이력이 있는 계정만 이용할 수 있습니다. 다시 로그인해 보시고, 문제가 계속되면 문의해주세요.'
                : '매물 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}
            </p>
          </div>
        )}

        {/* 내 분석 기록 — 재열람 동선 (Phase 2-2G, 차감 없음) */}
        <button
          type="button"
          onClick={() => setShowReports((v) => !v)}
          className={[
            'rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors',
            showReports ? 'bg-[#0F172A] text-white' : 'bg-white text-[#0F172A] hover:bg-[#F1F5F9]',
          ].join(' ')}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
        >
          <History size={12} className={showReports ? 'text-white' : 'text-[#1a56db]'} />
          <span className="text-[12px] font-semibold">내 분석 기록</span>
        </button>
      </div>

      {/* 경쟁밀도 범례 — 모바일에서 패널 열리면 숨김, PC는 우측 하단 고정 */}
      <div
        className={[
          'absolute bottom-3 right-3 z-10 rounded-xl bg-white/90 px-3 py-2.5 flex-col gap-1.5',
          selectedDong || target || showReports ? 'hidden sm:flex' : 'flex',
        ].join(' ')}
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)' }}
      >
        <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-0.5">
          경쟁밀도 (면적당)
        </p>
        {[
          { color: '#DC2626', label: '경쟁 치열' },
          { color: '#D97706', label: '경쟁 보통' },
          { color: '#15803D', label: '경쟁 여유' },
          { color: '#CBD5E1', label: '데이터 없음' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] font-medium text-[#374151]">{label}</span>
          </div>
        ))}
      </div>

      {/* 동 정보 패널 */}
      {selectedDong && (
        <DongPanel
          dong={selectedDong}
          onClose={() => setSelectedDong(null)}
          onCta={() => handleDongCta(selectedDong)}
          ctaLoading={dongCtaLoading}
        />
      )}

      {/* 동 CTA 잔액 확인 후 지도 이동 안내 토스트 — 검색바 아래 */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-24px)]">
          <div
            className="rounded-full bg-[#0F172A] text-white px-4 py-2 text-[12px] font-semibold whitespace-nowrap"
            style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}
          >
            {toast}
          </div>
        </div>
      )}

      {/* 대상 선택 → 반경 프리셋 + 분석 실행 (Phase 2-2D/2-2G — 트리거 공통 흐름)
          key로 대상 변경 시 확인 단계 리셋 */}
      {target && !analysis && (
        <RadiusControl
          key={`${target.lat},${target.lng}`}
          target={target}
          radiusM={radiusM}
          onRadiusChange={setRadiusM}
          gate={gate}
          balance={balance}
          analyzing={analyzing}
          error={analysisError}
          onAnalyze={runAnalysis}
          onClose={() => setTarget(null)}
        />
      )}

      {/* 내 분석 기록 패널 — 재열람(차감 없음) */}
      {showReports && !analysis && (
        <MyReportsPanel
          onClose={() => setShowReports(false)}
          onOpen={(a) => {
            setAnalysis(a)
            setShowReports(false)
            setTarget(null)
          }}
        />
      )}

      {/* 인라인 리포트 패널 — 페이지 이동 없음 */}
      {analysis && (
        <AnalysisPanel analysis={analysis} onClose={() => setAnalysis(null)} />
      )}
    </div>
  )
}
