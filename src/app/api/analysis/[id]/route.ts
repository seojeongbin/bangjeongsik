import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-user'
import { assembleAnalysisData } from '@/lib/data/analysisData'
import type { AnalysisResponse } from '@/types/analysis'

/**
 * 분석 리포트 재열람 (Phase 2-2D) — 크레딧 차감 없음.
 * 소유 검증: server-user 클라이언트 + RLS(analysis_reports_select_own) —
 * 남의 리포트 id로는 조회 자체가 안 되므로 404.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const { data: report, error } = await supabase
    .from('analysis_reports')
    .select('id, lat, lng, radius_m, bedrooms, baths, guests, address, report_token, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !report) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const lat = Number(report.lat)
  const lng = Number(report.lng)
  const radiusM = Number(report.radius_m)
  const bedrooms = Number(report.bedrooms)
  const baths = Number(report.baths)
  const guests = Number(report.guests)
  const address = (report.address as string | null) ?? null

  // 재열람 — airroi_cache 90일 캐시에 잡히므로 추가 과금 거의 없음
  const data = await assembleAnalysisData({ lat, lng, radiusM, bedrooms, baths, guests, address })

  const response: AnalysisResponse = {
    reportId: report.id as string,
    reportToken: report.report_token as string,
    report: {
      lat, lng, radiusM, bedrooms, baths, guests, address,
      createdAt: report.created_at as string,
    },
    data,
  }

  return NextResponse.json(response)
}
