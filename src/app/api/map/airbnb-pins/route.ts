import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server-user'

/**
 * 에어비앤비 매물 핀 조회 (Phase 2-2C).
 * 게이트: 로그인(프록시 + 여기서 재검증) + 크레딧 지급/구매 이력 1회 이상
 * (PRD_master_reconciliation.md §1.C — Free 지급 포함, 신규 가입 즉시 충족.
 *  잔액 0이어도 핀은 보임 — 재구매 동선 유지).
 * 응답은 화이트리스트 필드만: 익명 키·좌표·침실수. 개별 숙소 특정 정보 없음.
 */

const PAGE = 1000 // PostgREST 기본 max_rows — 초과분은 range 루프로 수집

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 크레딧 이력 검증 — RLS(select_own)로 본인 행만 보임
  const { count, error: historyError } = await supabase
    .from('credit_transactions')
    .select('id', { count: 'exact', head: true })

  if (historyError) {
    Sentry.captureException(historyError, { tags: { api: 'airbnb-pins' } })
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
  }

  if (!count) {
    return NextResponse.json(
      { error: '크레딧 이력이 있는 계정만 이용할 수 있습니다.' },
      { status: 403 },
    )
  }

  // 핀 조회 — airbnb_pins는 RLS policy 없음 → service role로만 읽기
  const pins: Array<{ id: string; lat: number; lng: number; bedrooms: number | null }> = []
  let fetchedAt: string | null = null

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('airbnb_pins')
      .select('listing_key, lat, lng, bedrooms, fetched_at')
      .order('listing_key')
      .range(offset, offset + PAGE - 1)

    if (error) {
      Sentry.captureException(error, { tags: { api: 'airbnb-pins' } })
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    for (const row of data ?? []) {
      pins.push({
        id: row.listing_key as string,
        lat: Number(row.lat),
        lng: Number(row.lng),
        bedrooms: row.bedrooms as number | null,
      })
      if (!fetchedAt || (row.fetched_at as string) > fetchedAt) {
        fetchedAt = row.fetched_at as string
      }
    }

    if (!data || data.length < PAGE) break
  }

  return NextResponse.json({ pins, count: pins.length, fetchedAt })
}
