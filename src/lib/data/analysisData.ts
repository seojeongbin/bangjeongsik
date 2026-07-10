import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAirbnbData, type AirbnbAreaStats } from '@/lib/data/airbnbData'
import { getBuildingData, type BuildingResult } from '@/lib/data/buildingData'
import type { AnalysisDataBundle } from '@/types/analysis'

/**
 * 분석 리포트 데이터 조립 (Phase 2-2D) — POST /api/analysis(신규)와
 * GET /api/analysis/[id](재열람)가 공유. 부분 실패 허용(allSettled) —
 * 실패한 섹션은 null로 내려가고 UI가 UnavailableNotice를 표시한다.
 *
 * 건축물대장은 address가 있을 때만 조회 — 핀 좌표는 오차가 있어
 * 건축물대장 조회 입력으로 사용 금지 (PRD_master_reconciliation.md §1.D).
 */
export async function assembleAnalysisData(params: {
  lat: number
  lng: number
  radiusM: number
  bedrooms: number
  baths: number
  guests: number
  address?: string | null
}): Promise<AnalysisDataBundle> {
  const { lat, lng, radiusM, bedrooms, baths, guests, address } = params

  const [airbnbResult, buildingResult, competitionResult] = await Promise.allSettled([
    getAirbnbData({ lat, lng, radiusM, bedrooms, baths, guests }),
    address
      ? getBuildingData(address)
      : Promise.reject(new Error('NO_ADDRESS')),
    supabaseAdmin.rpc('get_nearby_minbak', { user_lat: lat, user_lng: lng, radius_m: radiusM }),
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

  return { airbnb, building, competitionCount, minbakUpdatedAt }
}
