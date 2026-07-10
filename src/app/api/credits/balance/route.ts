import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 현재 로그인 사용자의 크레딧 잔액 조회 (Phase 2-2B).
 * get_my_credit_balance RPC(security invoker) — RLS가 본인 행만 집계.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('get_my_credit_balance')

  if (error) {
    Sentry.captureException(error, { tags: { api: 'credits-balance' } })
    return NextResponse.json({ error: '잔액 조회에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ balance: typeof data === 'number' ? data : 0 })
}
