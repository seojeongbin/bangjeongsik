import { describe, it, expect, vi, beforeAll } from 'vitest'

/**
 * [4] GET /api/credits/history — balanceAfter 누적합 검증 (Phase 2-2J).
 * server-user 클라이언트를 모킹해 원장 행을 주입하고, 응답의 잔액 추이가
 * SUM(delta)와 정확히 일치하는지 확인한다.
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
let queryError: { message: string } | null = null
let receivedLimit = 0
let receivedAscending: boolean | null = null

vi.mock('@/lib/supabase/server-user', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
    },
    from: (table: string) => ({
      select: () => ({
        order: (_col: string, opts: { ascending: boolean }) => {
          receivedAscending = opts.ascending
          return {
            limit: async (n: number) => {
              receivedLimit = n
              if (queryError) return { data: null, error: queryError }
              if (table !== 'credit_transactions') return { data: [], error: null }
              // 실제 쿼리 의미(오름차순 + limit) 재현
              const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
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
    queryError = null
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

    // 쿼리는 오름차순 + 상한 500행으로 나가야 함 (누적합 전제)
    expect(receivedAscending).toBe(true)
    expect(receivedLimit).toBe(500)
  })

  it('이력 없음 → 빈 배열 + 잔액 0', async () => {
    currentUser = { id: 'user-1' }
    rows = []
    const res = await GET()
    const json = await res.json()
    expect(json.entries).toEqual([])
    expect(json.balance).toBe(0)
  })

  it('비로그인 → 401', async () => {
    currentUser = null
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('행 수가 상한(500)에 걸리면 truncated=true로 표시된다', async () => {
    currentUser = { id: 'user-1' }
    rows = Array.from({ length: 600 }, (_, i) =>
      row(`t${i}`, 1, 'purchase_basic', `2026-07-01T00:00:${String(i % 60).padStart(2, '0')}.${String(i).padStart(3, '0')}Z`),
    )
    const res = await GET()
    const json = await res.json()
    expect(json.entries).toHaveLength(500)
    expect(json.truncated).toBe(true)
  })

  it('DB 오류 → 500 (에러 상세 미노출)', async () => {
    currentUser = { id: 'user-1' }
    queryError = { message: 'relation does not exist' }
    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('relation') // DB 구조 노출 금지
    queryError = null
  })
})
