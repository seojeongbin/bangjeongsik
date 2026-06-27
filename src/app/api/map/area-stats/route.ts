import { NextRequest, NextResponse } from 'next/server'
import { getAirbnbData } from '@/lib/data/airbnbData'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  try {
    const stats = await getAirbnbData({ lat, lng, bedrooms: 2, baths: 1, guests: 4 })
    return NextResponse.json({
      available: true,
      avgRevenue: stats.avgRevenue,
      avgOccupancy: stats.avgOccupancy,
      avgAdr: stats.avgAdr,
      dataMonth: stats.dataMonth,
    })
  } catch {
    return NextResponse.json({ available: false })
  }
}
