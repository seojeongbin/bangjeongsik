import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAirbnbData, type AirbnbAreaStats } from '@/lib/data/airbnbData'
import { getBuildingData, type BuildingResult } from '@/lib/data/buildingData'
import ReportSections from '@/components/report/ReportSections'

// Phase 2-2D: 섹션 UI는 ReportSections(공유 컴포넌트)로 추출됨 — 이 페이지는
// 기존 구매자 토큰 호환·재열람용 얇은 래퍼로 유지 (PRD_master_reconciliation.md §1.B).

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

      {/* 본문 — 공유 섹션 */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <ReportSections
          reportToken={token}
          airbnb={airbnb}
          building={building}
          competitionCount={competitionCount}
          competitionRadiusM={500}
          minbakUpdatedAt={minbakUpdatedAt}
          bedrooms={2}
          baths={1}
          guests={4}
        />
      </div>
    </div>
  )
}
