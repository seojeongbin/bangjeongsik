import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 크레딧 상품 구매 체크아웃 (Phase 2-2B) + 월간 구독 (Phase 2-2H).
 * 주소 입력·지오코딩은 결제와 분리됨 — 분석 실행 시점(Step 2-2D)으로 이동.
 * metadata.user_id → 웹훅이 크레딧 지급 대상 식별에 사용
 * (구독은 checkout metadata가 subscription/order로 복사되는 Polar 동작에 의존,
 *  누락 대비 폴백은 웹훅에서 subscriptions 테이블 역조회).
 */
const PLANS = ['basic', 'pro', 'sub_basic'] as const
type Plan = (typeof PLANS)[number]

/** 이 상태면 이미 구독 중 — 중복 구독 차단 대상 */
const BLOCKING_SUB_STATUSES = ['active', 'trialing', 'past_due']

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
      : plan === 'pro'
        ? process.env.POLAR_PRODUCT_ID_PRO
        : process.env.POLAR_SUBSCRIPTION_ID_BASIC

  if (!POLAR_TOKEN || !productId) {
    return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
  }

  // 구독 중복 방지: 이미 유효한 구독이 있으면 새 구독 결제 차단 (RLS — 본인 행만 조회됨)
  if (plan === 'sub_basic') {
    const { data: existing, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .in('status', BLOCKING_SUB_STATUSES)
      .limit(1)
    // 조회 실패 시엔 진행 허용 — Polar 쪽에서도 결제가 성립해야 하고, 상태 미러 조회
    // 실패로 정상 구매를 막지 않는다 (테이블 미생성 등 과도기 대비)
    if (!subError && existing && existing.length > 0) {
      return NextResponse.json(
        { error: '이미 구독 중입니다. 구독 관리에서 현재 구독을 확인해주세요.' },
        { status: 409 },
      )
    }
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
      // user_id/plan → 웹훅 order/subscription 이벤트의 data.metadata로 전달됨
      metadata: { user_id: user.id, plan },
      successUrl: `${appUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
    })
    return NextResponse.json({ url: checkout.url })
  } catch {
    return NextResponse.json({ error: '결제 세션 생성에 실패했습니다.' }, { status: 502 })
  }
}
