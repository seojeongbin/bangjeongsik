import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 현재 로그인 사용자의 구독 상태 조회 (Phase 2-2H).
 * server-user + RLS(subscriptions_select_own) — 본인 행만 조회됨.
 * 유효 구독(active/trialing/past_due) 1건을 우선 반환, 없으면 null.
 */
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, cancel_at_period_end, current_period_end, started_at, ends_at')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    Sentry.captureException(error, { tags: { api: 'subscription' } })
    return NextResponse.json({ error: '구독 조회에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    subscription: data
      ? {
          status: data.status,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          currentPeriodEnd: data.current_period_end,
          startedAt: data.started_at,
          endsAt: data.ends_at,
        }
      : null,
  })
}
