import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: '좌표가 필요합니다.' }, { status: 400 })
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: '잘못된 좌표입니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('get_nearby_minbak', {
    user_lat: lat,
    user_lng: lng,
    radius_m: 500,
  })

  if (error) {
    console.error('get_nearby_minbak error:', error)
    return NextResponse.json({ error: '데이터 조회에 실패했습니다.' }, { status: 500 })
  }

  const count: number =
    typeof data === 'number'
      ? data
      : (data as { count: number } | null)?.count ?? 0

  return NextResponse.json({ count })
}
