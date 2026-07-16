'use client'

import { useMemo, useState } from 'react'
import { MapPin, Building2, TrendingUp, Calculator, Percent, AlertCircle, Loader2 } from 'lucide-react'
import type { AirbnbAreaStats } from '@/lib/data/airbnbData'
import type { BuildingResult } from '@/lib/data/buildingData'
import { deriveSeasonality } from '@/lib/report/seasonality'
import BedroomSelector from '@/components/report/BedroomSelector'
import SeasonalityChart from '@/components/report/SeasonalityChart'
import RevenuePositionGauge from '@/components/report/RevenuePositionGauge'
import CompetitionCompareChart from '@/components/report/CompetitionCompareChart'
import ProfitCalculator from '@/components/report/ProfitCalculator'

// Phase 2-2D — /report/[token] 페이지와 /explore 인라인 패널이 공유하는
// 리포트 섹션 묶음. 데이터 조회는 호출부 책임 (페이지: 서버 조회 / 패널: /api/analysis 응답).
// Phase 2-2F — 클라이언트 컴포넌트로 전환: 스펙 변경 시 재조회된 stats를 이 레벨에서
// 들고 통계 칩·수익 분포 게이지·계절성 차트·수익성 계산기가 함께 갱신된다.
// 모든 AirROI 수치는 집계 통계값만 노출 (개별 숙소 특정 정보 금지 — CLAUDE.md 핵심 원칙).

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtWan(n: number) {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
}

function fmtPct(n: number) {
  // AirROI가 ratio(0~1) 반환 시 *100, 이미 % 값이면 그대로
  const pct = n <= 1 ? n * 100 : n
  return `${Math.round(pct)}%`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 전국 임의 주소 대상 밀도(개/km²) 기준 — getMapoCompLabel(동 실측 개수 기준)과 통일 금지
function getCompetitionLabel(count: number, radiusM: number) {
  const area = Math.PI * Math.pow(radiusM / 1000, 2)
  const density = count / area
  if (density <= 20) return { label: '경쟁 적음', color: 'green' as const, density }
  if (density <= 60) return { label: '경쟁 보통', color: 'yellow' as const, density }
  return { label: '경쟁 치열', color: 'red' as const, density }
}

const COMPETITION_STYLES = {
  green: { badge: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]', numColor: '#16A34A' },
  yellow: { badge: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]', numColor: '#D97706' },
  red: { badge: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]', numColor: '#DC2626' },
}

const BUILDING_BADGE = {
  green: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
  yellow: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
  gray: 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]',
}

// ─── building blocks (패널의 커스텀 섹션에서도 재사용) ─────────────────────────

export function SectionCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string
  icon: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex items-center justify-center rounded-[10px]"
          style={{ width: '36px', height: '36px', background: '#EEF4FF', flexShrink: 0 }}
        >
          {icon}
        </div>
        <h2 className="font-bold text-[#0F172A] flex-1 min-w-0" style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  )
}

export function UnavailableNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[#94A3B8] py-3" style={{ fontSize: '13px' }}>
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </div>
  )
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-[12px] border p-4"
      style={
        accent
          ? { background: '#EEF4FF', borderColor: '#BDD0F5' }
          : { background: '#F8F9FB', borderColor: '#E4E7EC' }
      }
    >
      <p className="mb-1" style={{ fontSize: '12px', color: accent ? '#1D4ED8' : '#64748B' }}>{label}</p>
      <p
        className="font-black tabular-nums"
        style={{
          fontSize: accent ? '1.6rem' : '1.4rem',
          letterSpacing: '-0.04em',
          lineHeight: '1.1',
          color: accent ? '#1D4ED8' : '#0F172A',
        }}
      >
        {value}
      </p>
    </div>
  )
}

/** 건축물대장 조회 결과 카드 (뱃지 + 3개 지표 + 각주) — 패널의 주소 입력형 섹션에서 재사용 */
export function BuildingResultCards({ building }: { building: BuildingResult }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span className={`rounded-full font-bold px-3 py-1 text-[11px] ${BUILDING_BADGE[building.color]}`}>
          외도민 {building.label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
        <StatChip label="건물용도" value={building.buildingPurpose} />
        <StatChip label="층수" value={building.floors} />
        <StatChip label="사용승인일" value={building.approvalDate} />
      </div>
      <p className="text-[11px] text-[#94A3B8]" style={{ lineHeight: '1.7' }}>
        건축물대장 기준 참고 추정치입니다. 최종 확인은 관할 구청에 문의하세요.
        <span className="ml-1">조회일: {building.checkedAt}</span>
      </p>
    </>
  )
}

function EstimateBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-0.5 text-[10px] font-bold text-[#64748B]">
      추정치
    </span>
  )
}

// ─── composite ────────────────────────────────────────────────────────────────

export interface ReportSectionsProps {
  /** BedroomSelector가 사용하는 재조회 키 (구 report_purchases 토큰 또는 신규 analysis_reports 토큰) */
  reportToken: string
  airbnb: AirbnbAreaStats | null
  building: BuildingResult | null
  competitionCount: number | null
  competitionRadiusM: number
  minbakUpdatedAt: string
  bedrooms: number
  baths: number
  guests: number
  /** 지정 시 건축물대장 섹션을 통째로 대체 (핀 경로: 좌표 오차 때문에 주소 직접 입력 UI 사용) */
  buildingSlot?: React.ReactNode
}

export default function ReportSections({
  reportToken,
  airbnb,
  building,
  competitionCount,
  competitionRadiusM,
  minbakUpdatedAt,
  bedrooms,
  baths,
  guests,
  buildingSlot,
}: ReportSectionsProps) {
  // 스펙 재조회로 갱신되는 AirROI 통계 — 게이지·차트·계산기의 단일 소스
  const [stats, setStats] = useState<AirbnbAreaStats | null>(airbnb)
  const [statsLoading, setStatsLoading] = useState(false)

  const seasonality = useMemo(
    () => (stats ? deriveSeasonality(stats.avgRevenue, stats.monthlyDistributions) : null),
    [stats],
  )

  const competition =
    competitionCount !== null ? getCompetitionLabel(competitionCount, competitionRadiusM) : null
  const compStyles = competition ? COMPETITION_STYLES[competition.color] : null

  return (
    <div className="space-y-4">
      {/* ① 경쟁밀도 */}
      <SectionCard
        title={`경쟁밀도 — 반경 ${competitionRadiusM}m 내 외도민`}
        icon={<MapPin size={16} className="text-[#1D4ED8]" />}
      >
        {competitionCount !== null && competition && compStyles ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className={`rounded-full font-bold px-3 py-1 text-[11px] ${compStyles.badge}`}>
                {competition.label}
              </span>
              {minbakUpdatedAt && (
                <span className="text-[11px] text-[#94A3B8]">
                  {(() => {
                    const d = new Date(minbakUpdatedAt)
                    return isNaN(d.getTime()) ? '' : `${d.getFullYear()}년 ${d.getMonth() + 1}월 기준 공공데이터`
                  })()}
                </span>
              )}
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span
                className="font-black tabular-nums"
                style={{ fontSize: '2.2rem', lineHeight: '1', letterSpacing: '-0.04em', color: compStyles.numColor }}
              >
                {competitionCount}
              </span>
              <span className="mb-1 font-bold text-[#64748B]" style={{ fontSize: '16px' }}>개</span>
            </div>

            {/* 밀도 비교 시각화 — 마포구 평균·최고 동 대비 */}
            <div className="mb-3">
              <CompetitionCompareChart count={competitionCount} radiusM={competitionRadiusM} />
            </div>

            {stats && (
              <div
                className="rounded-[12px] border border-[#E4E7EC] px-4 py-3 flex items-center gap-3"
                style={{ background: '#F8F9FB' }}
              >
                <Percent size={14} className="text-[#1D4ED8] shrink-0" />
                <span className="text-[13px] text-[#475569]">
                  이 동네 평균 예약률{' '}
                  <strong className="text-[#0F172A]">{fmtPct(stats.avgOccupancy)}</strong>
                  <span className="text-[#94A3B8] ml-1">(AirROI 추정)</span>
                </span>
              </div>
            )}
            <p className="mt-3 text-[11px] text-[#94A3B8]" style={{ lineHeight: '1.7' }}>
              공공데이터 인허가 기준입니다. 미등록 숙소(특례 사업자 포함)는 포함되지 않습니다.
            </p>
          </>
        ) : (
          <UnavailableNotice message="좌표 정보가 없어 경쟁밀도를 조회하지 못했습니다." />
        )}
      </SectionCard>

      {/* ② 건축물대장 */}
      {buildingSlot ?? (
        <SectionCard title="건축물대장 — 외도민 등록 가능성" icon={<Building2 size={16} className="text-[#1D4ED8]" />}>
          {building ? (
            <BuildingResultCards building={building} />
          ) : (
            <UnavailableNotice message="건축물대장 조회에 실패했습니다. 잠시 후 다시 시도해주세요." />
          )}
        </SectionCard>
      )}

      {/* ③ 수익 분석 — 스펙 선택 + 통계 칩 + 분포 게이지 + 계절성 차트 */}
      <SectionCard
        title="동네 수익 분석 — AirROI 통계"
        icon={<TrendingUp size={16} className="text-[#1D4ED8]" />}
        badge={<EstimateBadge />}
      >
        {stats ? (
          <>
            <p className="text-[12px] text-[#64748B] mb-4" style={{ lineHeight: '1.6' }}>
              개별 숙소 수치가 아닌 이 동네 전체 통계 기반 추정값입니다. 방·욕실·게스트를 바꾸면
              아래 모든 수치와 계산기 기본값이 함께 갱신됩니다.
            </p>

            <div className="mb-5">
              <BedroomSelector
                token={reportToken}
                initialBedrooms={bedrooms}
                initialBaths={baths}
                initialGuests={guests}
                onStatsChange={setStats}
                onLoadingChange={setStatsLoading}
              />
            </div>

            {/* 통계 결과 — 재조회 중 스피너 오버레이 */}
            <div className="relative">
              {statsLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 size={22} className="text-[#1D4ED8] animate-spin" />
                </div>
              )}
              <div className={`space-y-4 transition-opacity ${statsLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatChip label="평균 월 예상 수익" value={fmtWan(stats.avgRevenue)} accent />
                  <StatChip label="동네 평균 객단가 (ADR)" value={fmtWan(stats.avgAdr)} />
                  <StatChip label="평균 예약률" value={fmtPct(stats.avgOccupancy)} />
                </div>

                {/* 수익 구간 분포 — 신규 percentiles 있으면 게이지, 없으면(구 캐시) 구간 칩 폴백 */}
                {stats.revenuePercentiles ? (
                  <RevenuePositionGauge
                    estimate={stats.avgRevenue}
                    percentiles={stats.revenuePercentiles}
                  />
                ) : (
                  (stats.revenueP25 != null || stats.revenueP75 != null) && (
                    <div
                      className="rounded-[12px] border border-[#E4E7EC] px-4 py-4"
                      style={{ background: '#F8F9FB' }}
                    >
                      <p className="text-[12px] font-semibold text-[#0F172A] mb-3">월 수익 구간 분포</p>
                      <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '13px' }}>
                        {stats.revenueP25 != null && (
                          <span className="rounded-[8px] bg-[#F1F5F9] px-3 py-1.5 text-[#64748B] font-medium">
                            하위 25% · {fmtWan(stats.revenueP25)} 이하
                          </span>
                        )}
                        <span className="rounded-[8px] bg-[#EEF4FF] px-3 py-1.5 text-[#1D4ED8] font-bold">
                          중간 · {fmtWan(stats.avgRevenue)}
                        </span>
                        {stats.revenueP75 != null && (
                          <span className="rounded-[8px] bg-[#DCFCE7] px-3 py-1.5 text-[#15803D] font-medium">
                            상위 25% · {fmtWan(stats.revenueP75)} 이상
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* 계절성 차트 — 성수기/비수기 자동 분류 */}
                {seasonality ? (
                  <div className="rounded-[12px] border border-[#E4E7EC] px-4 py-4" style={{ background: '#F8F9FB' }}>
                    <p className="text-[12px] font-semibold text-[#0F172A] mb-3">
                      월별 수익 추이 — 성수기/비수기
                    </p>
                    <SeasonalityChart seasonality={seasonality} />
                  </div>
                ) : (
                  <p className="text-[11px] text-[#94A3B8]">
                    월별 분포 데이터가 아직 캐시에 없어 계절성 차트를 표시할 수 없습니다. (다음 데이터 갱신 시 제공)
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-[#94A3B8]">
              기준월: {stats.dataMonth} · 수집일: {fmtDate(stats.fetchedAt)}
            </p>
          </>
        ) : (
          <UnavailableNotice message="AirROI 데이터를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요." />
        )}
      </SectionCard>

      {/* ④ 수익성 계산기 — 성수기/비수기 실데이터 기본값 */}
      <SectionCard
        title="수익성 계산기 — 월세 상한선 진단"
        icon={<Calculator size={16} className="text-[#1D4ED8]" />}
        badge={<EstimateBadge />}
      >
        <ProfitCalculator seasonality={seasonality} />
      </SectionCard>

      {/* 면책문구 */}
      <div
        className="rounded-r-[12px] px-[18px] py-[14px] text-[12px] text-[#64748B]"
        style={{ borderLeft: '3px solid #93C5FD', background: '#F8F9FB', lineHeight: '1.8' }}
      >
        <p>본 리포트는 외국인관광도시민박업(365일 운영 기준)으로 작성되었습니다.</p>
        <p>특례 사업자(연 180일)의 경우 예상 수익의 약 50% 수준으로 보정하여 참고하시기 바랍니다.</p>
        <p className="mt-1">
          수익·예약률·계절성 수치는 AirROI 추정 데이터 기반 통계 가공값이며, 호스트 설정에 따라 실제와 다를 수 있습니다.
          {stats && (
            <span className="ml-1 text-[#94A3B8]">(데이터 수집일: {fmtDate(stats.fetchedAt)})</span>
          )}
        </p>
        <p className="mt-1">
          건물 등록 가능 여부는 건축물대장 기준 참고 추정치이며, 최종 확인은 관할 구청 등 담당 관청에 직접 문의하시기 바랍니다.
        </p>
        <p className="mt-1">과세·세무 관련 판단은 세무사 등 전문가 확인이 필요합니다.</p>
        <p className="mt-1 text-[#1D4ED8]">
          본 리포트는 참고용 시뮬레이션이며, 최종 창업 결정은 전문가에게 확인하시기 바랍니다.
        </p>
      </div>
    </div>
  )
}
