import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 현재 로그인 사용자의 크레딧 원장 이력 조회 (Phase 2-2I — 마이페이지).
 * server-user + RLS(credit_transactions_select_own) — 본인 행만 조회됨. 조회 전용.
 * 잔액 추이(balanceAfter)는 오름차순 누적합으로 계산 후 최신순으로 반환.
 */

const MAX_ROWS = 500

export interface CreditHistoryEntry {
  id: string
  delta: number
  reason: string
  createdAt: string
  balanceAfter: number
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, delta, reason, created_at')
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS)

  if (error) {
    Sentry.captureException(error, { tags: { api: 'credits-history' } })
    return NextResponse.json({ error: '이력 조회에 실패했습니다.' }, { status: 500 })
  }

  let running = 0
  const ascending: CreditHistoryEntry[] = (data ?? []).map((row) => {
    running += Number(row.delta)
    return {
      id: row.id as string,
      delta: Number(row.delta),
      reason: row.reason as string,
      createdAt: row.created_at as string,
      balanceAfter: running,
    }
  })

  return NextResponse.json({
    entries: ascending.reverse(),
    balance: running,
    truncated: ascending.length === MAX_ROWS,
  })
}
