import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server-user'
import { assembleAnalysisData } from '@/lib/data/analysisData'
import { RADIUS_PRESETS, type AnalysisResponse } from '@/types/analysis'

/**
 * 분석 실행 (Phase 2-2D) — 크레딧 1개 차감 + 리포트 생성 + 데이터 반환.
 * 차감·생성은 consume_credit_and_create_report RPC 단일 트랜잭션(연타 이중 차감 방지).
 * 데이터 조회가 부분 실패해도 리포트는 생성됨 — 재열람(GET /api/analysis/[id])에서 재시도 가능.
 */

interface Body {
  lat?: unknown
  lng?: unknown
  radiusM?: unknown
  bedrooms?: unknown
  baths?: unknown
  guests?: unknown
  address?: unknown
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const lat = typeof body.lat === 'number' ? body.lat : NaN
  const lng = typeof body.lng === 'number' ? body.lng : NaN
  const radiusM = typeof body.radiusM === 'number' ? body.radiusM : NaN
  // 스펙 미지정 시 리포트 기본값 (기존 /report와 동일: 2/1/4)
  const bedrooms = body.bedrooms === undefined ? 2 : Number(body.bedrooms)
  const baths = body.baths === undefined ? 1 : Number(body.baths)
  const guests = body.guests === undefined ? 4 : Number(body.guests)
  const address =
    typeof body.address === 'string' && body.address.trim().length > 0
      ? body.address.trim()
      : null

  const bathsIsHalfStep = Number.isFinite(baths) && Math.round(baths * 2) === baths * 2

  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180 ||
    !(RADIUS_PRESETS as readonly number[]).includes(radiusM) ||
    !Number.isInteger(bedrooms) || bedrooms < 1 || bedrooms > 4 ||
    !bathsIsHalfStep            || baths < 1    || baths > 3    ||
    !Number.isInteger(guests)   || guests < bedrooms            || guests > 16 ||
    (address !== null && address.length > 200)
  ) {
    return NextResponse.json({ error: '요청 값이 올바르지 않습니다.' }, { status: 400 })
  }

  // 크레딧 차감 + 리포트 생성 (원자적)
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    'consume_credit_and_create_report',
    {
      p_user_id: user.id,
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusM,
      p_bedrooms: bedrooms,
      p_baths: baths,
      p_guests: guests,
      p_address: address,
    },
  )

  if (rpcError) {
    if (rpcError.message.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다. 충전 후 이용해주세요.', code: 'INSUFFICIENT_CREDITS' },
        { status: 402 },
      )
    }
    if (rpcError.message.includes('PROFILE_NOT_FOUND')) {
      return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 403 })
    }
    Sentry.captureException(rpcError, { tags: { api: 'analysis-create' } })
    return NextResponse.json({ error: '분석 실행에 실패했습니다.' }, { status: 500 })
  }

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
  if (!row?.report_id || !row?.report_token) {
    Sentry.captureMessage('consume_credit RPC returned empty row', 'error')
    return NextResponse.json({ error: '분석 실행에 실패했습니다.' }, { status: 500 })
  }

  // 데이터 조립 (캐시 우선, 부분 실패 허용)
  const data = await assembleAnalysisData({ lat, lng, radiusM, bedrooms, baths, guests, address })

  const response: AnalysisResponse = {
    reportId: row.report_id as string,
    reportToken: row.report_token as string,
    balance: typeof row.balance === 'number' ? row.balance : undefined,
    report: {
      lat, lng, radiusM, bedrooms, baths, guests, address,
      createdAt: new Date().toISOString(),
    },
    data,
  }

  return NextResponse.json(response)
}
