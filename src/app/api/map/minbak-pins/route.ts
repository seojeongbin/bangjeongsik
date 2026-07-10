import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * 외도민(외국인관광도시민박업) 개별 매물 핀 조회 — 무료 레이어.
 * 게이트 없음: 공공데이터 인허가 정보라 누구에게나 노출 (CLAUDE.md 개별 숙소
 * 노출 정책 — 외도민은 상호·주소 노출 가능, 연락처·대표자 실명 제외).
 * 응답 필드는 상호·주소·좌표만 — 수익·객단가 등 통계는 절대 붙이지 않는다.
 * 범위: 마포구 + 영업/정상 + 좌표 보유 (2026-07 기준 1,672건).
 */

export const dynamic = 'force-dynamic'

const PAGE = 1000 // PostgREST 기본 max_rows — 초과분은 range 루프로 수집

export async function GET() {
  const pins: Array<{ id: string; name: string; address: string; lat: number; lng: number }> = []
  let updatedAt: string | null = null

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('minbak_listings')
      .select('id, name, road_address, lat, lng, data_updated_at')
      // 실제 DB 값은 '영업/정상' — 구 /api/map/listings의 .eq('status', '영업')은
      // 0건 반환 버그였음 (docs/외도민핀_이식참고.md, 2026-07-10 확인)
      .eq('status', '영업/정상')
      .ilike('road_address', '%마포구%')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('id')
      .range(offset, offset + PAGE - 1)

    if (error) {
      Sentry.captureException(error, { tags: { api: 'minbak-pins' } })
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    for (const row of data ?? []) {
      pins.push({
        id: row.id as string,
        name: (row.name as string) ?? '',
        address: (row.road_address as string) ?? '',
        lat: Number(row.lat),
        lng: Number(row.lng),
      })
      const rowUpdated = row.data_updated_at as string | null
      if (rowUpdated && (!updatedAt || rowUpdated > updatedAt)) {
        updatedAt = rowUpdated
      }
    }

    if (!data || data.length < PAGE) break
  }

  return NextResponse.json({ pins, count: pins.length, updatedAt })
}
