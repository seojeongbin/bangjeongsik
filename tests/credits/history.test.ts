import { describe, it, expect, vi, beforeAll } from 'vitest'

/**
 * [4] GET /api/credits/history — balanceAfter 누적합 검증 (Phase 2-2J, 버그 수정 후).
 *
 * 2-2J에서 발견된 버그: 구버전은 "오름차순 + 상한 500행"만 읽어 그 안에서
 * 누적합을 했기 때문에, 거래 500건을 넘는 사용자는 오래된 행만 반영된 잘못된
 * 잔액을 봤다. 수정 후에는 잔액을 get_my_credit_balance() RPC(전체 SUM)로
 * 별도 조회하고, 이력은 최신순으로 가져와 그 정확한 잔액에서 역산한다.
 * 이 테스트는 특히 "행 수가 상한을 넘어도 balance는 전체 합과 정확히 일치"를
 * 검증해 회귀를 막는다.
 */

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

interface FakeRow {
  id: string
  delta: number
  reason: string
  created_at: string
}

let currentUser: { id: string } | null = { id: 'user-1' }
let rows: FakeRow[] = []
let rowsError: { message: string } | null = null
let rpcError: { message: string } | null = null
let receivedLimit = 0
let receivedAscending: boolean | null = null

vi.mock('@/lib/supabase/server-user', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
    },
    // 실제 get_my_credit_balance()는 Postgres에서 전체 테이블을 SUM하는
    // RPC — 여기서도 (limit이 걸린 rows가 아니라) 전체 `rows`를 합산해 흉내낸다.
    rpc: async (name: string) => {
      if (name !== 'get_my_credit_balance') return { data: null, error: { message: `unknown rpc: ${name}` } }
      if (rpcError) return { data: null, error: rpcError }
      const sum = rows.reduce((s, r) => s + r.delta, 0)
      return { data: sum, error: null }
    },
    from: (table: string) => ({
      select: () => ({
        order: (_col: string, opts: { ascending: boolean }) => {
          receivedAscending = opts.ascending
          return {
            limit: async (n: number) => {
              receivedLimit = n
              if (rowsError) return { data: null, error: rowsError }
              if (table !== 'credit_transactions') return { data: [], error: null }
              // 실제 쿼리 의미(최신순 정렬 + limit) 재현
              const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
              return { data: sorted.slice(0, n), error: null }
            },
          }
        },
      }),
    }),
  }),
}))

let GET: () => Promise<Response>

beforeAll(async () => {
  ;({ GET } = await import('@/app/api/credits/history/route'))
})

function row(id: string, delta: number, reason: string, at: string): FakeRow {
  return { id, delta, reason, created_at: at }
}

describe('GET /api/credits/history', () => {
  it('balanceAfter 누적합이 각 시점 SUM(delta)와 일치하고, 최신순으로 반환된다', async () => {
    currentUser = { id: 'user-1' }
    rowsError = null
    rpcError = null
    rows = [
      row('t1', 1, 'signup_free', '2026-07-01T00:00:00Z'),
      row('t2', 3, 'purchase_basic', '2026-07-02T00:00:00Z'),
      row('t3', -1, 'consume_report', '2026-07-03T00:00:00Z'),
      row('t4', 4, 'subscription_monthly', '2026-07-04T00:00:00Z'),
      row('t5', -1, 'consume_report', '2026-07-05T00:00:00Z'),
    ]

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()

    // 최종 잔액 = SUM(delta) = 1+3-1+4-1 = 6
    expect(json.balance).toBe(6)
    expect(json.truncated).toBe(false)

    // 최신순 (t5 → t1) + 시점별 누적 잔액
    expect(json.entries.map((e: { id: string }) => e.id)).toEqual(['t5', 't4', 't3', 't2', 't1'])
    expect(json.entries.map((e: { balanceAfter: number }) => e.balanceAfter)).toEqual([6, 7, 3, 4, 1])

    // 각 행에서 balanceAfter - delta = 직전 행 잔액 (내부 일관성)
    const asc = [...json.entries].reverse()
    let running = 0
    for (const e of asc) {
      running += e.delta
      expect(e.balanceAfter).toBe(running)
    }

    // 쿼리는 최신순(descending) + 상한보다 1행 더(501)로 나가야 함 (truncated 경계 판정용)
    expect(receivedAscending).toBe(false)
    expect(receivedLimit).toBe(501)
  })

  it('이력 없음 → 빈 배열 + 잔액 0', async () => {
    currentUser = { id: 'user-1' }
    rows = []
    const res = await GET()
    const json = await res.json()
    expect(json.entries).toEqual([])
    expect(json.balance).toBe(0)
    expect(json.truncated).toBe(false)
  })

  it('비로그인 → 401', async () => {
    currentUser = null
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('정확히 상한(500)건일 때 truncated=false (경계 오탐 없음)', async () => {
    currentUser = { id: 'user-1' }
    rows = Array.from({ length: 500 }, (_, i) =>
      row(`t${i}`, 1, 'purchase_basic', `2026-07-01T00:00:${String(i % 60).padStart(2, '0')}.${String(i).padStart(3, '0')}Z`),
    )
    const res = await GET()
    const json = await res.json()
    expect(json.entries).toHaveLength(500)
    expect(json.truncated).toBe(false)
    expect(json.balance).toBe(500)
  })

  it('상한(500) 초과 시에도 balance는 전체 합과 정확히 일치 (핵심 회귀 방지)', async () => {
    currentUser = { id: 'user-1' }
    // 550건, delta는 매 건 +1 → 전체 합 550. 구버전 버그라면 "오래된 500행"만 더해
    // 550이 아닌 다른 값을 반환했을 것.
    rows = Array.from({ length: 550 }, (_, i) =>
      row(`t${i}`, 1, 'purchase_basic', `2026-07-01T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`),
    )
    const res = await GET()
    const json = await res.json()

    expect(json.balance).toBe(550) // 전체 SUM(delta) — 이력 상한과 무관하게 정확
    expect(json.truncated).toBe(true)
    expect(json.entries).toHaveLength(500)
    // 최신 500건(t549 ~ t50)이 보여야 함 — 오래된 행이 잘려나가는 게 아니라 최근 행이 남아야 함
    expect(json.entries[0].id).toBe('t549')
    expect(json.entries[499].id).toBe('t50')
  })

  it('이력 조회 DB 오류 → 500 (에러 상세 미노출)', async () => {
    currentUser = { id: 'user-1' }
    rowsError = { message: 'relation does not exist' }
    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('relation') // DB 구조 노출 금지
    rowsError = null
  })

  it('잔액 RPC 오류 → 500 (에러 상세 미노출)', async () => {
    currentUser = { id: 'user-1' }
    rows = [row('t1', 1, 'signup_free', '2026-07-01T00:00:00Z')]
    rpcError = { message: 'permission denied for function get_my_credit_balance' }
    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('permission denied')
    rpcError = null
  })
})
