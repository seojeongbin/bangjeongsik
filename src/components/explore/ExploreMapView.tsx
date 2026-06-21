'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { X, MapPin, Lock, Loader2 } from 'lucide-react'
import dongCenters from '../../../data/seoul-mapo-dong-centers.json'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DongCenter {
  dong_nm: string
  adm_cd: string
  adm_cd2: string
  lat: number
  lng: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPO_CENTER = { lat: 37.556, lng: 126.921 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 마포구 16개 동 실측 분포 기준 (2026-06) — 타 구 확장 시 그 구 데이터로 재산정 필요
function getMapoCompLabel(count: number): {
  label: string
  badgeCls: string
  numColor: string
} {
  if (count <= 31) {
    return { label: '경쟁 적음', badgeCls: 'bg-[#DCFCE7] text-[#15803D]', numColor: '#15803D' }
  }
  if (count <= 96) {
    return { label: '경쟁 보통', badgeCls: 'bg-[#FEF3C7] text-[#D97706]', numColor: '#D97706' }
  }
  return { label: '경쟁 치열', badgeCls: 'bg-[#FEE2E2] text-[#DC2626]', numColor: '#DC2626' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DongPin({
  dong,
  isSelected,
  onClick,
}: {
  dong: DongCenter
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
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
  compLoading: boolean
  compCount: number | null
  onClose: () => void
}

function DongPanel({ dong, compLoading, compCount, onClose }: DongPanelProps) {
  const router = useRouter()
  const compInfo = compCount !== null ? getMapoCompLabel(compCount) : null

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

        {/* 경쟁밀도 — 무료 */}
        <div className="bg-[#F8FAFF] rounded-[12px] border border-[#E2EAF8] p-4 mb-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-[11px] font-bold text-[#1a56db] uppercase tracking-wide">
              경쟁밀도
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-semibold">
              무료
            </span>
          </div>

          {compLoading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 size={13} className="animate-spin text-[#94A3B8]" />
              <span className="text-[12px] text-[#94A3B8]">조회 중...</span>
            </div>
          ) : compCount !== null && compInfo ? (
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
                    {compCount}
                  </span>
                  <span className="text-[13px] text-[#64748B] ml-1.5">개</span>
                </div>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${compInfo.badgeCls}`}>
                  {compInfo.label}
                </span>
              </div>
              <p className="text-[9px] text-[#94A3B8] mt-1.5">
                반경 500m · 공공데이터 외국인관광도시민박업 인허가 기준
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
  const [compLoading, setCompLoading] = useState(false)
  const [compCount, setCompCount] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedDong) return

    setCompLoading(true)
    setCompCount(null)
    let cancelled = false

    fetch(`/api/explore/competition?lat=${selectedDong.lat}&lng=${selectedDong.lng}`)
      .then((r) => r.json())
      .then((data: { count?: number }) => {
        if (!cancelled) {
          setCompCount(typeof data.count === 'number' ? data.count : 0)
          setCompLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompCount(null)
          setCompLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedDong])

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
        {(dongCenters as DongCenter[]).map((dong) => (
          <CustomOverlayMap
            key={dong.adm_cd}
            position={{ lat: dong.lat, lng: dong.lng }}
            yAnchor={1.2}
          >
            <DongPin
              dong={dong}
              isSelected={selectedDong?.adm_cd === dong.adm_cd}
              onClick={() => setSelectedDong(dong)}
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
          compLoading={compLoading}
          compCount={compCount}
          onClose={() => setSelectedDong(null)}
        />
      )}
    </div>
  )
}
