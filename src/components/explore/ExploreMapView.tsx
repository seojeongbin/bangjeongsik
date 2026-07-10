'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Map, MapMarker, MarkerClusterer, Circle, CustomOverlayMap, Polygon, useKakaoLoader } from 'react-kakao-maps-sdk'
import { X, MapPin, Lock, Loader2, Home, Sparkles } from 'lucide-react'
import { createClient as createBrowserClient } from '@/lib/supabase/browser'
import AnalysisPanel from '@/components/explore/AnalysisPanel'
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

// 로즈 도트 마커 (개별 숙소 특정 정보 없음 — 위치 점만)
const AIRBNB_PIN_IMAGE = {
  src:
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="#FF385C" stroke="#fff" stroke-width="1.5"/></svg>',
    ),
  size: { width: 14, height: 14 },
}

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
}

function DongPanel({ dong, onClose }: DongPanelProps) {
  const router = useRouter()
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

        {/* CTA */}
        <button
          type="button"
          onClick={() => router.push(`/checkout?dong=${encodeURIComponent(dong.dong_nm)}`)}
          className="w-full py-[14px] rounded-[12px] text-white font-extrabold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
            boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
          }}
        >
          {dong.dong_nm} 매물 주소 입력하고 정밀 분석받기
        </button>
        <p className="text-center text-[10px] text-[#94A3B8] mt-1.5">
          종합 입지 점수 · AirROI 수익 통계 · 건축물대장 포함
        </p>
      </div>
    </div>
  )
}

// ─── 에어비앤비 핀 레이어 컨트롤 (Phase 2-2D) ─────────────────────────────────

function PinLoginCard() {
  const handleLogin = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        // /auth/callback 기본 복귀 경로가 /explore — 로그인 후 이 화면으로 돌아옴
        redirectTo: `${window.location.origin}/auth/callback`,
        // 카카오 개발자 콘솔 비즈니스 인증 전에는 account_email 동의항목 요청 불가(KOE205).
        // 명시하지 않으면 Supabase가 기본 전체 스코프를 요청해 인가 코드 발급이 거부됨.
        scopes: 'profile_nickname profile_image',
      },
    })
  }

  return (
    <div
      className="rounded-xl bg-white px-3.5 py-3 w-[220px]"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}
    >
      <p className="text-[12px] font-bold text-[#0F172A] mb-1">로그인이 필요합니다</p>
      <p className="text-[11px] text-[#64748B] mb-2.5" style={{ lineHeight: 1.5 }}>
        에어비앤비 매물 핀은 회원 전용입니다. 가입 시 무료 분석 1회가 지급됩니다.
      </p>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleLogin}
          className="w-full rounded-[10px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] px-2.5 py-1.5 text-[12px] font-bold text-[#1a56db]"
        >
          카카오 로그인
        </button>
      </div>
    </div>
  )
}

interface RadiusControlProps {
  radiusM: RadiusPreset
  onRadiusChange: (r: RadiusPreset) => void
  balance: number | null
  analyzing: boolean
  error: { msg: string; insufficient?: boolean } | null
  onAnalyze: () => void
  onClose: () => void
}

function RadiusControl({
  radiusM,
  onRadiusChange,
  balance,
  analyzing,
  error,
  onAnalyze,
  onClose,
}: RadiusControlProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] max-w-[380px]">
      <div
        className="rounded-[16px] bg-white p-4"
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[12px] font-bold text-[#0F172A]">분석 반경 선택</p>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <X size={13} className="text-[#64748B]" />
          </button>
        </div>

        <div className="flex gap-1.5 mb-3">
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
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
              <Link
                href="/checkout"
                className="inline-block mt-1 text-[12px] font-bold text-[#1a56db] underline"
              >
                크레딧 충전하기 →
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
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
          ) : (
            <>
              <Sparkles size={15} />
              이 위치 분석하기
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-[#94A3B8] mt-1.5">
          크레딧 1개가 차감됩니다 · 재열람 무료
          {balance !== null && (
            <span className="ml-1 font-semibold text-[#64748B]">(보유 {balance}회)</span>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExploreMapView() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''
  const [sdkLoading, sdkError] = useKakaoLoader({ appkey, libraries: ['clusterer'] })

  const [selectedDong, setSelectedDong] = useState<DongCenter | null>(null)
  const [hoveredAdmCd, setHoveredAdmCd] = useState<string | null>(null)

  // 에어비앤비 핀 레이어 (Phase 2-2D)
  const [pinStatus, setPinStatus] = useState<PinLayerStatus>('off')
  const [pins, setPins] = useState<AirbnbPin[]>([])
  const [pinsFetchedAt, setPinsFetchedAt] = useState<string | null>(null)
  const [selectedPin, setSelectedPin] = useState<AirbnbPin | null>(null)
  const [radiusM, setRadiusM] = useState<RadiusPreset>(500)
  const [balance, setBalance] = useState<number | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<{ msg: string; insufficient?: boolean } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)

  async function refreshBalance() {
    try {
      const res = await fetch('/api/credits/balance')
      if (!res.ok) return
      const data = (await res.json()) as { balance?: number }
      if (typeof data.balance === 'number') setBalance(data.balance)
    } catch {
      // 잔액 표시는 부가 정보 — 실패해도 무시
    }
  }

  async function togglePinLayer() {
    if (pinStatus === 'loading') return
    if (pinStatus === 'on') {
      setPinStatus('off')
      setSelectedPin(null)
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
    if (!selectedPin || analyzing) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: selectedPin.lat, lng: selectedPin.lng, radiusM }),
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
      if (typeof body.balance === 'number') setBalance(body.balance)
      setSelectedPin(null)
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
        center={MAPO_CENTER}
        level={7}
        style={{ width: '100%', height: '100%' }}
        onClick={() => {
          setSelectedDong(null)
          setSelectedPin(null)
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
                setSelectedPin(null)
              }}
              onMouseEnter={() => setHoveredAdmCd(dong.adm_cd)}
              onMouseLeave={() => setHoveredAdmCd(null)}
            />
          </CustomOverlayMap>
        ))}

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
                  setSelectedPin(pin)
                  setSelectedDong(null)
                  setAnalysisError(null)
                }}
              />
            ))}
          </MarkerClusterer>
        )}

        {/* 선택 핀 반경 원형 오버레이 */}
        {selectedPin && (
          <Circle
            center={{ lat: selectedPin.lat, lng: selectedPin.lng }}
            radius={radiusM}
            strokeWeight={2}
            strokeColor="#1a56db"
            strokeOpacity={0.9}
            fillColor="#1a56db"
            fillOpacity={0.12}
          />
        )}
      </Map>

      {/* 동 개수 배지 */}
      <div
        className="absolute top-3 left-3 sm:left-auto sm:right-3 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 z-10"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
      >
        <MapPin size={12} className="text-[#1a56db]" />
        <span className="text-[12px] font-semibold text-[#0F172A]">
          마포구 {(dongCenters as DongCenter[]).length}개 동
        </span>
      </div>

      {/* 에어비앤비 매물 핀 레이어 토글 (Phase 2-2D — 회원 전용) */}
      <div className="absolute top-3 left-3 sm:top-14 sm:left-auto sm:right-3 z-10 flex flex-col items-start sm:items-end gap-2 mt-10 sm:mt-0">
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
      </div>

      {/* 경쟁밀도 범례 — 모바일에서 패널 열리면 숨김, PC는 우측 하단 고정 */}
      <div
        className={[
          'absolute bottom-3 right-3 z-10 rounded-xl bg-white/90 px-3 py-2.5 flex-col gap-1.5',
          selectedDong || selectedPin ? 'hidden sm:flex' : 'flex',
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
        />
      )}

      {/* 핀 선택 → 반경 프리셋 + 분석 실행 (Phase 2-2D) */}
      {selectedPin && !analysis && (
        <RadiusControl
          radiusM={radiusM}
          onRadiusChange={setRadiusM}
          balance={balance}
          analyzing={analyzing}
          error={analysisError}
          onAnalyze={runAnalysis}
          onClose={() => setSelectedPin(null)}
        />
      )}

      {/* 인라인 리포트 패널 — 페이지 이동 없음 */}
      {analysis && (
        <AnalysisPanel analysis={analysis} onClose={() => setAnalysis(null)} />
      )}
    </div>
  )
}
