import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 현재 로그인 사용자의 크레딧 원장 이력 조회 (Phase 2-2I — 마이페이지, 2-2J 버그 수정).
 * server-user + RLS(credit_transactions_select_own) — 본인 행만 조회됨. 조회 전용.
 *
 * 잔액은 이력 목록(상한 있음)에서 파생하지 않고 get_my_credit_balance() RPC로
 * 별도 집계한다 — 거래 건수가 상한을 넘는 사용자도 항상 정확한 현재 잔액을 보장.
 * (구버전 버그: 오름차순+상한 500행만 읽어 누적합했더니, 500건 넘는 사용자는
 * 오래된 행만 반영되고 최근 이력·잔액이 실제와 어긋났음)
 * 이력은 최신순으로 조회하고, balanceAfter는 정확한 현재 잔액에서 delta를
 * 하나씩 빼며 과거로 역산한다.
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

  const [{ data: balanceData, error: balanceError }, { data: rowsData, error: rowsError }] =
    await Promise.all([
      supabase.rpc('get_my_credit_balance'),
      supabase
        .from('credit_transactions')
        .select('id, delta, reason, created_at')
        .order('created_at', { ascending: false })
        // 상한보다 1행 더 조회 — "정확히 상한"과 "상한 초과"를 구분해 truncated 오탐 방지
        .limit(MAX_ROWS + 1),
    ])

  if (balanceError || rowsError) {
    Sentry.captureException(balanceError ?? rowsError, { tags: { api: 'credits-history' } })
    return NextResponse.json({ error: '이력 조회에 실패했습니다.' }, { status: 500 })
  }

  const fetched = rowsData ?? []
  const truncated = fetched.length > MAX_ROWS
  const rows = truncated ? fetched.slice(0, MAX_ROWS) : fetched

  const balance = typeof balanceData === 'number' ? balanceData : 0
  let running = balance
  const entries: CreditHistoryEntry[] = rows.map((row) => {
    const balanceAfter = running
    running -= Number(row.delta)
    return {
      id: row.id as string,
      delta: Number(row.delta),
      reason: row.reason as string,
      createdAt: row.created_at as string,
      balanceAfter,
    }
  })

  return NextResponse.json({ entries, balance, truncated })
}
