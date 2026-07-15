import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { createClient } from '@/lib/supabase/server-user'

/**
 * Polar 고객 포털 세션 생성 (Phase 2-2H).
 * 구독 관리(해지·결제수단 변경·영수증)는 Polar 포털에 위임 —
 * 자체 취소 API를 만들지 않아 결제 상태의 단일 소스를 Polar로 유지.
 * server-user + RLS로 본인 구독의 polar_customer_id만 조회 가능.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('polar_customer_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error, { tags: { api: 'subscription-portal' } })
    return NextResponse.json({ error: '구독 조회에 실패했습니다.' }, { status: 500 })
  }

  if (!sub) {
    return NextResponse.json({ error: '구독 내역이 없습니다.' }, { status: 404 })
  }

  const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN
  if (!POLAR_TOKEN) {
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
    const session = await polar.customerSessions.create({
      customerId: sub.polar_customer_id,
      returnUrl: `${appUrl}/checkout`,
    })
    return NextResponse.json({ url: session.customerPortalUrl })
  } catch (err) {
    Sentry.captureException(err, { tags: { api: 'subscription-portal' } })
    return NextResponse.json({ error: '구독 관리 페이지 연결에 실패했습니다.' }, { status: 502 })
  }
}
