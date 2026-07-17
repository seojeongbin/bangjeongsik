import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { NextRequest } from 'next/server'
import { createSupabaseAdminMock, type SupabaseAdminMock } from '../helpers/supabaseAdminMock'

/**
 * [1] 크레딧 원장 — POST /api/analysis (크레딧 차감 + 리포트 생성) (Phase 2-2J).
 * consume_credit_and_create_report RPC는 SQL 의미를 에뮬레이션한 목으로 대체
 * (FOR UPDATE 직렬화 = 사용자별 뮤텍스). 실제 SQL 원문의 원자성 구문은
 * tests/sql/rpc-contract.test.ts가 별도로 고정한다.
 */

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

// AirROI/건축물대장/경쟁밀도 조립은 이 테스트의 관심사가 아님 — 외부 호출 차단
vi.mock('@/lib/data/analysisData', () => ({
  assembleAnalysisData: vi.fn(async () => ({
    airbnb: null,
    building: null,
    competitionCount: null,
    minbakUpdatedAt: '',
  })),
}))

let admin: SupabaseAdminMock = createSupabaseAdminMock()

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    rpc: (name: string, params?: Record<string, unknown>) => admin.client.rpc(name, params),
    from: (table: string) => admin.client.from(table),
  },
}))

// server-user: 로그인 사용자 전환 가능한 목
let currentUser: { id: string } | null = { id: 'user-1' }

vi.mock('@/lib/supabase/server-user', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
    },
  }),
}))

let POST: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  ;({ POST } = await import('@/app/api/analysis/route'))
})

beforeEach(() => {
  admin = createSupabaseAdminMock()
  currentUser = { id: 'user-1' }
})

const VALID_BODY = { lat: 37.5563, lng: 126.9236, radiusM: 500, bedrooms: 2, baths: 1, guests: 4 }

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('http://localhost/api/analysis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
  )
}

/** 원장에 지급 행 추가 (테스트 픽스처) */
function grant(userId: string, delta: number, reason: string) {
  admin.state.ledger.push({
    id: `tx_fixture_${Math.random()}`,
    user_id: userId,
    delta,
    reason,
    ref_id: null,
    created_at: new Date().toISOString(),
  })
}

describe('POST /api/analysis — 크레딧 차감', () => {
  it('잔액 1 이상 → 정확히 -1 차감 + 리포트 생성 + 남은 잔액 반환', async () => {
    admin.state.profiles.add('user-1')
    grant('user-1', 3, 'purchase_basic')

    const res = await post(VALID_BODY)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.reportId).toBeTruthy()
    expect(json.reportToken).toBeTruthy()
    expect(json.balance).toBe(2)

    // 원장: 지급 +3, 차감 -1 — 잔액은 항상 SUM(delta)
    const consumes = admin.state.ledger.filter((r) => r.reason === 'consume_report')
    expect(consumes).toHaveLength(1)
    expect(consumes[0].delta).toBe(-1)
    expect(consumes[0].ref_id).toBe(json.reportId) // 차감 행이 리포트를 참조
    expect(admin.balance('user-1')).toBe(2)
    expect(admin.state.reports).toHaveLength(1)
  })

  it('잔액 0 → 402 + INSUFFICIENT_CREDITS, 원장 무변경·리포트 미생성', async () => {
    admin.state.profiles.add('user-1')

    const res = await post(VALID_BODY)
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.code).toBe('INSUFFICIENT_CREDITS')

    expect(admin.state.ledger).toHaveLength(0)
    expect(admin.state.reports).toHaveLength(0)
  })

  it('동시 요청 2건·잔액 1 → 정확히 1건만 성공, 이중 차감 없음 (직렬화)', async () => {
    admin.state.profiles.add('user-1')
    grant('user-1', 1, 'signup_free')

    const [res1, res2] = await Promise.all([post(VALID_BODY), post(VALID_BODY)])
    const statuses = [res1.status, res2.status].sort()

    expect(statuses).toEqual([200, 402])
    // 차감 행은 정확히 1개 — 잔액이 음수로 내려가지 않음
    expect(admin.state.ledger.filter((r) => r.reason === 'consume_report')).toHaveLength(1)
    expect(admin.balance('user-1')).toBe(0)
    expect(admin.state.reports).toHaveLength(1)
  })

  it('연속 차감 후에도 잔액 = SUM(delta) 불변식 유지', async () => {
    admin.state.profiles.add('user-1')
    grant('user-1', 3, 'purchase_basic')
    grant('user-1', 4, 'subscription_monthly')

    await post(VALID_BODY)
    await post(VALID_BODY)

    const sum = admin.state.ledger
      .filter((r) => r.user_id === 'user-1')
      .reduce((s, r) => s + r.delta, 0)
    expect(sum).toBe(5) // 3 + 4 - 1 - 1
    expect(admin.balance('user-1')).toBe(sum)
  })

  it('비로그인 → 401, 차감 RPC 자체가 호출되지 않음', async () => {
    currentUser = null
    const res = await post(VALID_BODY)
    expect(res.status).toBe(401)
    expect(admin.rpcCalls).toHaveLength(0)
  })

  it('입력 검증 실패(반경 프리셋 외) → 400, 차감 RPC 미호출', async () => {
    admin.state.profiles.add('user-1')
    grant('user-1', 3, 'purchase_basic')

    const res = await post({ ...VALID_BODY, radiusM: 300 })
    expect(res.status).toBe(400)
    expect(admin.rpcCalls).toHaveLength(0)
    expect(admin.balance('user-1')).toBe(3)
  })

  it('guests < bedrooms 등 스펙 검증 실패 → 400, 원장 무변경', async () => {
    admin.state.profiles.add('user-1')
    grant('user-1', 3, 'purchase_basic')

    const res = await post({ ...VALID_BODY, bedrooms: 3, guests: 2 })
    expect(res.status).toBe(400)
    expect(admin.state.ledger).toHaveLength(1) // 지급 행만
  })

  it('profiles 행 없음(PROFILE_NOT_FOUND) → 403', async () => {
    // profiles 미추가 상태
    const res = await post(VALID_BODY)
    expect(res.status).toBe(403)
    expect(admin.state.ledger).toHaveLength(0)
  })
})
