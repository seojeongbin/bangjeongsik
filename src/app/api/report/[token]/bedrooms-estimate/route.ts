import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAirbnbData } from '@/lib/data/airbnbData'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const { searchParams } = new URL(req.url)

  // 1. 토큰 검증 — 결제 완료된 건만 허용
  const { data: purchase, error } = await supabaseAdmin
    .from('report_purchases')
    .select('lat, lng')
    .eq('report_token', token)
    .maybeSingle()

  if (error || !purchase) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const lat = purchase.lat != null ? Number(purchase.lat) : null
  const lng = purchase.lng != null ? Number(purchase.lng) : null

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'NO_COORDS' }, { status: 400 })
  }

  // 2. 파라미터 파싱 및 검증
  const bedroomsStr = searchParams.get('bedrooms')
  const bathsStr    = searchParams.get('baths')
  const guestsStr   = searchParams.get('guests')

  if (!bedroomsStr || !bathsStr || !guestsStr) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 })
  }

  const bedrooms = parseInt(bedroomsStr, 10)
  const baths    = parseFloat(bathsStr)
  const guests   = parseInt(guestsStr, 10)

  const bathsIsHalfStep = Number.isFinite(baths) && Math.round(baths * 2) === baths * 2

  if (
    !Number.isInteger(bedrooms) || bedrooms < 1 || bedrooms > 4 ||
    !bathsIsHalfStep            || baths < 1    || baths > 3    ||
    !Number.isInteger(guests)   || guests < bedrooms             || guests > 16
  ) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 })
  }

  // 3. AirROI 조회 (캐시 우선)
  try {
    const stats = await getAirbnbData({ lat, lng, bedrooms, baths, guests })
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'DATA_UNAVAILABLE' }, { status: 503 })
  }
}
