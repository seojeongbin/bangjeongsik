import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * 결제 처리 상태 폴링 (Phase 2-2B): 웹훅의 크레딧 지급 완료 여부 확인.
 * webhook_events.checkout_id 존재 = order.paid 처리 완료.
 */
export async function GET(req: NextRequest) {
  const checkoutId = req.nextUrl.searchParams.get('checkout_id')

  if (!checkoutId || checkoutId.length > 200) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('webhook_events')
    .select('event_id')
    .eq('checkout_id', checkoutId)
    .limit(1)
    .maybeSingle()

  if (data) {
    return NextResponse.json({ paid: true })
  }

  return NextResponse.json({ pending: true })
}
