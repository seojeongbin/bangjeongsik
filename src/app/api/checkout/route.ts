import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const address = raw.address

  if (typeof address !== 'string' || address.trim().length === 0 || address.length > 200) {
    return NextResponse.json({ error: '주소가 올바르지 않습니다.' }, { status: 400 })
  }

  const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
  const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN
  const POLAR_PRODUCT = process.env.POLAR_PRODUCT_ID

  if (!KAKAO_KEY || !POLAR_TOKEN || !POLAR_PRODUCT) {
    return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
  }

  // 주소 → 좌표 변환 (서버 사이드 — KAKAO_REST_API_KEY 사용)
  let lat: number
  let lng: number
  try {
    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
    )
    if (!kakaoRes.ok) {
      return NextResponse.json({ error: '주소 변환에 실패했습니다.' }, { status: 502 })
    }
    const kakaoData = await kakaoRes.json()
    const doc = kakaoData.documents?.[0]
    if (!doc) {
      return NextResponse.json({ error: '주소를 찾을 수 없습니다. 도로명 또는 지번 주소로 다시 입력해주세요.' }, { status: 404 })
    }
    lat = parseFloat(doc.y)
    lng = parseFloat(doc.x)
  } catch {
    return NextResponse.json({ error: '주소 처리 중 오류가 발생했습니다.' }, { status: 502 })
  }

  // Polar Checkout 세션 생성
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const polar = new Polar({
      accessToken: POLAR_TOKEN,
      server: process.env.POLAR_SANDBOX === 'true' ? 'sandbox' : 'production',
    })
    const checkout = await polar.checkouts.create({
      products: [POLAR_PRODUCT],
      // address/lat/lng → 웹훅 order 이벤트의 data.metadata로 전달됨
      metadata: { address: address.trim(), lat, lng },
      successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    })
    return NextResponse.json({ url: checkout.url })
  } catch {
    return NextResponse.json({ error: '결제 세션 생성에 실패했습니다.' }, { status: 502 })
  }
}
