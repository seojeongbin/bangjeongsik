import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 크레딧 상품 구매 체크아웃 (Phase 2-2B).
 * 주소 입력·지오코딩은 결제와 분리됨 — 분석 실행 시점(Step 2-2D)으로 이동.
 * metadata.user_id → 웹훅이 크레딧 지급 대상 식별에 사용.
 */
const PLANS = ['basic', 'pro'] as const
type Plan = (typeof PLANS)[number]

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const plan = (body as Record<string, unknown>).plan
  if (typeof plan !== 'string' || !PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: '상품이 올바르지 않습니다.' }, { status: 400 })
  }

  // 크레딧은 계정 귀속 — 로그인 필수
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN
  const productId =
    plan === 'basic'
      ? process.env.POLAR_PRODUCT_ID_BASIC
      : process.env.POLAR_PRODUCT_ID_PRO

  if (!POLAR_TOKEN || !productId) {
    return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const polar = new Polar({
      accessToken: POLAR_TOKEN,
      server: process.env.POLAR_SANDBOX === 'true' ? 'sandbox' : 'production',
    })
    const checkout = await polar.checkouts.create({
      products: [productId],
      // user_id/plan → 웹훅 order 이벤트의 data.metadata로 전달됨
      metadata: { user_id: user.id, plan },
      successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    })
    return NextResponse.json({ url: checkout.url })
  } catch {
    return NextResponse.json({ error: '결제 세션 생성에 실패했습니다.' }, { status: 502 })
  }
}
