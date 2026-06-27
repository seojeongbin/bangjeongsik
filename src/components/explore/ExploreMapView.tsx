'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Map, CustomOverlayMap, Polygon, useKakaoLoader } from 'react-kakao-maps-sdk'
import { X, MapPin, Lock, Loader2 } from 'lucide-react'
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

// 동별 색상 — GeoJSON 공유 좌표로 확인한 실제 인접 관계 기준
// 인접한 동끼리 다른 색, 비인접 동은 색 재사용 가능 (8색으로 16개 동 커버)
// 4색 뮤트 팔레트 — 채도 낮고 명도 중간, 같은 계열 톤으로 통일감
// 인접 동끼리 다른 색 (4색 정리)
const DONG_COLORS: Record<string, string> = {
  상암동:  '#7BAEC8', // 스틸 블루
  성산2동: '#7BB89A', // 스틸 그린
  망원2동: '#C8958A', // 스틸 테라코타
  망원1동: '#7BAEC8', // 스틸 블루
  성산1동: '#C8B87A', // 스틸 골드
  합정동:  '#7BB89A', // 스틸 그린
  서교동:  '#7BAEC8', // 스틸 블루
  연남동:  '#7BB89A', // 스틸 그린
  서강동:  '#C8958A', // 스틸 테라코타
  신수동:  '#7BAEC8', // 스틸 블루
  대흥동:  '#7BB89A', // 스틸 그린
  용강동:  '#C8958A', // 스틸 테라코타
  염리동:  '#7BAEC8', // 스틸 블루
  도화동:  '#7BB89A', // 스틸 그린
  공덕동:  '#C8958A', // 스틸 테라코타
  아현동:  '#C8B87A', // 스틸 골드
}

// 테두리 전용 — 채우기색 대비 채도 높고 어두운 버전
const DONG_STROKE_COLORS: Record<string, string> = {
  상암동:  '#2878A8', // 딥 블루
  성산2동: '#2A8A60', // 딥 그린
  망원2동: '#A84030', // 딥 테라코타
  망원1동: '#2878A8',
  성산1동: '#A88820', // 딥 골드
  합정동:  '#2A8A60',
  서교동:  '#2878A8',
  연남동:  '#2A8A60',
  서강동:  '#A84030',
  신수동:  '#2878A8',
  대흥동:  '#2A8A60',
  용강동:  '#A84030',
  염리동:  '#2878A8',
  도화동:  '#2A8A60',
  공덕동:  '#A84030',
  아현동:  '#A88820',
}

function getDongColor(dong_nm: string): string {
  return DONG_COLORS[dong_nm] ?? '#94A3B8'
}

function getDongStrokeColor(dong_nm: string): string {
  return DONG_STROKE_COLORS[dong_nm] ?? '#475569'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DongPin({
  dong,
  density,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  dong: DongCenter
  density: number | null
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const compInfo = density !== null ? getMapoCompLabel(density) : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        'relative flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer select-none transition-all',
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
      {/* 밀도 등급 상시 표시 dot */}
      {compInfo && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ backgroundColor: compInfo.dotColor }}
        />
      )}
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
                </div>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${compInfo.badgeCls}`}>
                  {compInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                외도민 {count}개 · 반경 500m 기준
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExploreMapView() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''
  const [sdkLoading, sdkError] = useKakaoLoader({ appkey, libraries: [] })

  const [selectedDong, setSelectedDong] = useState<DongCenter | null>(null)
  const [hoveredAdmCd, setHoveredAdmCd] = useState<string | null>(null)

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
        onClick={() => setSelectedDong(null)}
      >
        {/* 동 경계선 — 핀보다 먼저 렌더링해 아래 레이어로 배치
            동별 다른 색으로 각 영역이 구분되도록 */}
        {dongBoundaries.features.map((feature) => {
          const color = getDongColor(feature.properties.dong_nm)
          const strokeColor = getDongStrokeColor(feature.properties.dong_nm)
          const isHighlighted =
            selectedDong?.adm_cd === feature.properties.adm_cd ||
            hoveredAdmCd === feature.properties.adm_cd
          return (
            <Polygon
              key={feature.properties.adm_cd}
              path={geojsonRingToPath(feature.geometry.coordinates)}
              strokeColor={strokeColor}
              strokeOpacity={isHighlighted ? 1 : 0.55}
              strokeWeight={isHighlighted ? 4 : 2.5}
              fillColor={color}
              fillOpacity={isHighlighted ? 0.50 : 0.30}
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
              density={getDongDensity(dong.dong_nm)}
              isSelected={selectedDong?.adm_cd === dong.adm_cd}
              onClick={() => setSelectedDong(dong)}
              onMouseEnter={() => setHoveredAdmCd(dong.adm_cd)}
              onMouseLeave={() => setHoveredAdmCd(null)}
            />
          </CustomOverlayMap>
        ))}
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

      {/* 동 정보 패널 */}
      {selectedDong && (
        <DongPanel
          dong={selectedDong}
          onClose={() => setSelectedDong(null)}
        />
      )}
    </div>
  )
}
