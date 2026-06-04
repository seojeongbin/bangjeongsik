import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('minbak_listings')
    .select('id, name, road_address, lat, lng')
    .eq('status', '영업')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(3000)

  if (error) {
    return NextResponse.json({ error: '데이터를 불러올 수 없습니다.' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
