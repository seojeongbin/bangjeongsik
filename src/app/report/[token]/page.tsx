import { notFound } from 'next/navigation'
import { MapPin, Building2, TrendingUp, BarChart3, Percent, AlertCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAirbnbData, type AirbnbAreaStats } from '@/lib/data/airbnbData'
import { getBuildingData, type BuildingResult } from '@/lib/data/buildingData'
import ReportSimulator from '@/components/report/ReportSimulator'

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

// ─── section components ───────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex items-center justify-center rounded-[11px]"
          style={{ width: '36px', height: '36px', background: '#EEF4FF', flexShrink: 0 }}
        >
          {icon}
        </div>
        <h2 className="font-bold text-[#0F172A]" style={{ fontSize: '15px' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function UnavailableNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[#94A3B8] py-3" style={{ fontSize: '13px' }}>
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: '#FAFBFF' }}>
      <p className="text-[#94A3B8] mb-1" style={{ fontSize: '12px' }}>{label}</p>
      <p className="font-black text-[#0F172A]" style={{ fontSize: '1.4rem', letterSpacing: '-0.04em', lineHeight: '1.1' }}>
        {value}
      </p>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // 1. 토큰 검증 — 없으면 404 (존재 자체 노출 안 함)
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from('report_purchases')
    .select('id, address, lat, lng, accessed_at')
    .eq('report_token', token)
    .maybeSingle()

  if (purchaseError || !purchase) notFound()

  // 2. 최초 열람 기록 (accessed_at IS NULL 조건 → 멱등 보장)
  if (!purchase.accessed_at) {
    await supabaseAdmin
      .from('report_purchases')
      .update({ accessed_at: new Date().toISOString() })
      .eq('report_token', token)
      .is('accessed_at', null)
  }

  const lat = purchase.lat != null ? Number(purchase.lat) : null
  const lng = purchase.lng != null ? Number(purchase.lng) : null

  // 3. 데이터 병렬 조회 — 부분 실패 허용
  const [airbnbResult, buildingResult, competitionResult] = await Promise.allSettled([
    lat !== null && lng !== null
      ? getAirbnbData({ lat, lng, bedrooms: 2, baths: 1, guests: 4 })
      : Promise.reject(new Error('NO_COORDS')),
    getBuildingData(purchase.address),
    lat !== null && lng !== null
      ? supabaseAdmin.rpc('get_nearby_minbak', { user_lat: lat, user_lng: lng, radius_m: 500 })
      : Promise.reject(new Error('NO_COORDS')),
  ])

  const airbnb: AirbnbAreaStats | null =
    airbnbResult.status === 'fulfilled' ? airbnbResult.value : null
  const building: BuildingResult | null =
    buildingResult.status === 'fulfilled' ? buildingResult.value : null
  const competitionCount: number | null =
    competitionResult.status === 'fulfilled'
      ? (typeof competitionResult.value.data === 'number'
          ? competitionResult.value.data
          : (competitionResult.value.data as { count: number } | null)?.count ?? 0)
      : null

  const competition =
    competitionCount !== null ? getCompetitionLabel(competitionCount, 500) : null

  // minbak 기준일 — 별도 경량 쿼리
  let minbakUpdatedAt = ''
  if (competitionCount !== null) {
    const { data: meta } = await supabaseAdmin
      .from('minbak_listings')
      .select('data_updated_at')
      .order('data_updated_at', { ascending: false })
      .limit(1)
      .single()
    minbakUpdatedAt = meta?.data_updated_at ?? ''
  }

  const compStyles = competition ? COMPETITION_STYLES[competition.color] : null

  return (
    <div className="min-h-screen bg-[#F0F5FF]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E2EAF8]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] mb-2"
              >
                결제 완료 리포트
              </span>
              <h1 className="font-black text-[#0F172A]" style={{ fontSize: 'clamp(1rem, 3.5vw, 1.3rem)', letterSpacing: '-0.03em' }}>
                {purchase.address}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">

        {/* ① 경쟁밀도 */}
        <SectionCard title="경쟁밀도 — 반경 500m 내 외도민" icon={<MapPin size={16} className="text-[#1a56db]" />}>
          {competition !== null && compStyles ? (
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
              <div className="flex items-end gap-2 mb-1">
                <span
                  className="font-black"
                  style={{ fontSize: '2rem', lineHeight: '1', letterSpacing: '-0.04em', color: compStyles.numColor }}
                >
                  {competitionCount}
                </span>
                <span className="mb-1 font-bold text-[#64748B]" style={{ fontSize: '16px' }}>개</span>
              </div>
              <p className="text-[#94A3B8] mb-4" style={{ fontSize: '11px' }}>
                밀도 약 {competition.density.toFixed(1)}개/km²
              </p>
              {airbnb && (
                <div
                  className="rounded-[12px] border border-[#E2EAF8] px-4 py-3 flex items-center gap-3"
                  style={{ background: '#FAFBFF' }}
                >
                  <Percent size={14} className="text-[#1a56db] shrink-0" />
                  <span className="text-[13px] text-[#475569]">
                    이 동네 평균 예약률{' '}
                    <strong className="text-[#0F172A]">{fmtPct(airbnb.avgOccupancy)}</strong>
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
        <SectionCard title="건축물대장 — 외도민 등록 가능성" icon={<Building2 size={16} className="text-[#1a56db]" />}>
          {building ? (
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
          ) : (
            <UnavailableNotice message="건축물대장 조회에 실패했습니다. 잠시 후 다시 시도해주세요." />
          )}
        </SectionCard>

        {/* ③ AirROI 수익 데이터 */}
        <SectionCard title="동네 수익 데이터 — AirROI 통계" icon={<TrendingUp size={16} className="text-[#1a56db]" />}>
          {airbnb ? (
            <>
              <p className="text-[12px] text-[#64748B] mb-3" style={{ lineHeight: '1.6' }}>
                개별 숙소 수치가 아닌 이 동네 전체 통계 기반 추정값입니다.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
                <StatChip label="동네 평균 객단가 (ADR)" value={fmtWan(airbnb.avgAdr)} />
                <StatChip label="평균 예약률" value={fmtPct(airbnb.avgOccupancy)} />
                <StatChip label="평균 월 예상 수익" value={fmtWan(airbnb.avgRevenue)} />
              </div>

              {(airbnb.revenueP25 != null || airbnb.revenueP75 != null) && (
                <div
                  className="rounded-[12px] border border-[#E2EAF8] px-4 py-4 mb-3"
                  style={{ background: '#FAFBFF' }}
                >
                  <p className="text-[12px] font-semibold text-[#0F172A] mb-3">
                    <BarChart3 size={13} className="inline mr-1.5 text-[#1a56db]" />
                    월 수익 구간 분포
                  </p>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '13px' }}>
                    {airbnb.revenueP25 != null && (
                      <span className="rounded-[8px] bg-[#F1F5F9] px-3 py-1.5 text-[#64748B] font-medium">
                        하위 25% · {fmtWan(airbnb.revenueP25)} 이하
                      </span>
                    )}
                    <span className="rounded-[8px] bg-[#EEF4FF] px-3 py-1.5 text-[#1a56db] font-bold">
                      중간 · {fmtWan(airbnb.avgRevenue)}
                    </span>
                    {airbnb.revenueP75 != null && (
                      <span className="rounded-[8px] bg-[#DCFCE7] px-3 py-1.5 text-[#15803D] font-medium">
                        상위 25% · {fmtWan(airbnb.revenueP75)} 이상
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#94A3B8]">
                기준월: {airbnb.dataMonth} · 수집일: {fmtDate(airbnb.fetchedAt)}
              </p>
            </>
          ) : (
            <UnavailableNotice message="AirROI 데이터를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요." />
          )}
        </SectionCard>

        {/* ④⑤ 수익 시뮬레이터 + 창업 가계부 */}
        <SectionCard
          title="수익 시뮬레이터 + 창업 가계부"
          icon={<BarChart3 size={16} className="text-[#1a56db]" />}
        >
          {airbnb && (
            <div
              className="mb-4 rounded-[10px] border border-[#BDD0F5] bg-[#EEF4FF] px-4 py-2.5 text-[12px] text-[#1a56db]"
            >
              AirROI 데이터로 객단가와 예약률이 미리 입력됐습니다. 월세·초기비용을 추가로 입력하세요.
            </div>
          )}
          <ReportSimulator
            initialNightlyRate={airbnb?.avgAdr}
            initialOccupancyRate={
              airbnb?.avgOccupancy != null
                ? airbnb.avgOccupancy <= 1
                  ? Math.round(airbnb.avgOccupancy * 100)
                  : Math.round(airbnb.avgOccupancy)
                : undefined
            }
          />
        </SectionCard>

        {/* 면책문구 */}
        <div
          className="rounded-r-[12px] px-[18px] py-[14px] text-[12px] text-[#64748B]"
          style={{ borderLeft: '3px solid #93C5FD', background: '#F8FAFF', lineHeight: '1.8' }}
        >
          <p>본 리포트는 외국인관광도시민박업(365일 운영 기준)으로 작성되었습니다.</p>
          <p>특례 사업자(연 180일)의 경우 예상 수익의 약 50% 수준으로 보정하여 참고하시기 바랍니다.</p>
          <p className="mt-1">
            수익·예약률 수치는 AirROI 추정 데이터 기반이며, 호스트 설정에 따라 실제와 다를 수 있습니다.
            {airbnb && (
              <span className="ml-1 text-[#94A3B8]">(데이터 수집일: {fmtDate(airbnb.fetchedAt)})</span>
            )}
          </p>
          <p className="mt-1">
            건물 등록 가능 여부는 건축물대장 기준 참고 추정치이며, 최종 확인은 관할 구청에 직접 문의하시기 바랍니다.
          </p>
          <p className="mt-1">과세·세무 관련 판단은 세무사 등 전문가 확인이 필요합니다.</p>
          <p className="mt-1 text-[#1a56db]">
            본 리포트는 참고용 시뮬레이션이며, 최종 창업 결정은 전문가에게 확인하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  )
}
