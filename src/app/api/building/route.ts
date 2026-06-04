import { NextRequest, NextResponse } from 'next/server'
import { getBuildingData } from '@/lib/data/buildingData'

export async function POST(req: NextRequest) {
  let address: string
  try {
    const body = await req.json()
    address = body.address
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!address || typeof address !== 'string' || address.length > 200) {
    return NextResponse.json({ error: '주소를 입력해주세요.' }, { status: 400 })
  }

  try {
    const result = await getBuildingData(address)
    return NextResponse.json(result)
  } catch (err) {
    const code = err instanceof Error ? err.message : ''
    if (code === 'ADDRESS_NOT_FOUND') {
      return NextResponse.json({ error: '주소를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (code === 'BUILDING_CONFIG_MISSING') {
      return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
    }
    return NextResponse.json({ error: '건축물대장 조회에 실패했습니다.' }, { status: 502 })
  }
}
