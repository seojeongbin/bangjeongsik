import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const checkoutId = req.nextUrl.searchParams.get('checkout_id')

  if (!checkoutId || checkoutId.length > 200) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('report_purchases')
    .select('report_token')
    .eq('checkout_id', checkoutId)
    .maybeSingle()

  if (data?.report_token) {
    return NextResponse.json({ token: data.report_token })
  }

  return NextResponse.json({ pending: true })
}
