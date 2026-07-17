import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createSupabaseAdminMock, type SupabaseAdminMock } from '../helpers/supabaseAdminMock'
import { subscriptionPayload, signedWebhookRequest, type SubscriptionOverrides } from '../helpers/polarPayloads'

/**
 * [3] 구독 상태 동기화 — subscription.* 웹훅 7종 (Phase 2-2J).
 * 핵심 보장: (a) 상태 미러만 갱신하고 크레딧 원장에 절대 개입하지 않음,
 * (b) 역순 도착(stale) 이벤트가 최신 상태를 덮지 않음(에뮬레이션 — SQL 원문은
 * tests/sql/rpc-contract.test.ts가 고정), (c) 알 수 없는 status/상품은 스킵.
 */

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/alert', () => ({
  sendAlertEmail: vi.fn(async () => undefined),
}))

let admin: SupabaseAdminMock = createSupabaseAdminMock()

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    rpc: (name: string, params?: Record<string, unknown>) => admin.client.rpc(name, params),
    from: (table: string) => admin.client.from(table),
  },
}))

let POST: (req: Request) => Promise<Response>
let sendAlertEmail: ReturnType<typeof vi.fn>

beforeAll(async () => {
  const route = await import('@/app/api/webhooks/polar/route')
  // Webhooks() 핸들러는 NextRequest 시그니처지만 런타임에서는 표준 Request만 사용
  POST = route.POST as unknown as (req: Request) => Promise<Response>
  const alert = await import('@/lib/alert')
  sendAlertEmail = vi.mocked(alert.sendAlertEmail) as unknown as ReturnType<typeof vi.fn>
})

beforeEach(() => {
  admin = createSupabaseAdminMock()
  vi.clearAllMocks()
})

const send = (o: SubscriptionOverrides = {}) => POST(signedWebhookRequest(subscriptionPayload(o)))

const EVENT_STATUS: Array<[SubscriptionOverrides['eventType'] & string, string]> = [
  ['subscription.created', 'incomplete'],
  ['subscription.updated', 'active'],
  ['subscription.active', 'active'],
  ['subscription.canceled', 'canceled'],
  ['subscription.uncanceled', 'active'],
  ['subscription.revoked', 'canceled'],
  ['subscription.past_due', 'past_due'],
]

describe('subscription.* — 상태 미러 동기화', () => {
  it('7종 이벤트 전부: upsert_subscription_state만 호출, 크레딧 지급 RPC·원장 절대 불개입', async () => {
    let seq = 0
    for (const [eventType, status] of EVENT_STATUS) {
      const res = await send({
        eventType,
        status,
        subscriptionId: `sub_${eventType}`,
        modifiedAt: `2026-07-17T0${seq++}:00:00Z`,
      })
      expect(res.status).toBe(200)
    }

    const upserts = admin.rpcCalls.filter((c) => c.name === 'upsert_subscription_state')
    expect(upserts).toHaveLength(EVENT_STATUS.length)
    // 크레딧 관련 호출/기록이 하나도 없어야 함 (원장과 완전 분리)
    expect(admin.rpcCalls.filter((c) => c.name === 'grant_purchase_credits')).toHaveLength(0)
    expect(admin.state.ledger).toHaveLength(0)
  })

  it('신규 구독 → inserted, 이후 상태 전이(active → canceled → revoked)가 미러에 반영', async () => {
    await send({ eventType: 'subscription.created', status: 'active', modifiedAt: '2026-07-17T01:00:00Z' })
    expect(admin.state.subscriptions.get('sub_1')).toMatchObject({ status: 'active', user_id: 'user-uuid-1' })

    // 해지 예약 (기간말 취소)
    await send({
      eventType: 'subscription.canceled',
      status: 'active',
      cancelAtPeriodEnd: true,
      endsAt: '2026-08-17T00:00:00Z',
      modifiedAt: '2026-07-17T02:00:00Z',
    })
    expect(admin.state.subscriptions.get('sub_1')).toMatchObject({
      status: 'active',
      cancel_at_period_end: true,
    })

    // 즉시 종료
    await send({ eventType: 'subscription.revoked', status: 'canceled', modifiedAt: '2026-07-17T03:00:00Z' })
    expect(admin.state.subscriptions.get('sub_1')).toMatchObject({ status: 'canceled' })
  })

  it('역순 도착 가드: 오래된 이벤트(polar_modified_at 과거)가 최신 상태를 덮지 않음', async () => {
    // 최신 상태(canceled, T2) 먼저 도착
    await send({ eventType: 'subscription.revoked', status: 'canceled', modifiedAt: '2026-07-17T02:00:00Z' })
    // 그 뒤 과거 이벤트(active, T1)가 늦게 도착
    const res = await send({ eventType: 'subscription.updated', status: 'active', modifiedAt: '2026-07-17T01:00:00Z' })

    expect(res.status).toBe(200)
    expect(admin.state.subscriptions.get('sub_1')?.status).toBe('canceled') // 안 덮임
  })

  it('구독 해지가 와도 이미 지급된 크레딧은 회수되지 않음 (원장 불변)', async () => {
    // 사전 상태: 구독 지급 +4가 원장에 존재
    admin.state.ledger.push({
      id: 'tx_pre',
      user_id: 'user-uuid-1',
      delta: 4,
      reason: 'subscription_monthly',
      ref_id: 'order_pre',
      created_at: '2026-07-01T00:00:00Z',
    })

    await send({ eventType: 'subscription.revoked', status: 'canceled' })

    expect(admin.balance('user-uuid-1')).toBe(4) // 그대로
    expect(admin.state.ledger).toHaveLength(1)
  })

  it('알 수 없는 status → RPC 미호출(영구 재시도 루프 방지) + 알림, 200', async () => {
    const res = await send({ status: 'some_future_status' })
    expect(res.status).toBe(200)
    expect(admin.rpcCalls).toHaveLength(0)
    expect(sendAlertEmail).toHaveBeenCalledTimes(1)
  })

  it('다른 상품(매핑 실패) 구독 이벤트 → RPC 미호출, 200', async () => {
    const res = await send({ productId: 'prod_other_unknown' })
    expect(res.status).toBe(200)
    expect(admin.rpcCalls).toHaveLength(0)
  })

  it('신규 구독인데 metadata.user_id 누락 → no_user_skipped + 운영자 알림, 200', async () => {
    const res = await send({ userId: null })
    expect(res.status).toBe(200)
    expect(admin.state.subscriptions.size).toBe(0)
    expect(sendAlertEmail).toHaveBeenCalledTimes(1)
  })

  it('기존 구독 행이 있으면 이후 이벤트의 user_id 누락과 무관하게 갱신됨', async () => {
    await send({ eventType: 'subscription.created', status: 'active', modifiedAt: '2026-07-17T01:00:00Z' })
    const res = await send({
      eventType: 'subscription.past_due',
      status: 'past_due',
      userId: null,
      modifiedAt: '2026-07-17T02:00:00Z',
    })
    expect(res.status).toBe(200)
    expect(admin.state.subscriptions.get('sub_1')?.status).toBe('past_due')
    expect(sendAlertEmail).not.toHaveBeenCalled()
  })

  it('상태 동기화 RPC 실패 → 에러 re-throw (Polar 재시도 경로)', async () => {
    admin.forceRpcError('upsert_subscription_state', 'db down')
    await expect(send({})).rejects.toMatchObject({ message: 'db down' })
  })
})
