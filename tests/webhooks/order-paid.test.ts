import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createSupabaseAdminMock, type SupabaseAdminMock } from '../helpers/supabaseAdminMock'
import { orderPaidPayload, signedWebhookRequest } from '../helpers/polarPayloads'

/**
 * [2] 웹훅 멱등성 — /api/webhooks/polar order.paid (Phase 2-2J).
 * 서명 검증은 실제 standardwebhooks 경로를 통과시키고,
 * supabaseAdmin·alert·Sentry만 모킹한다.
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

describe('order.paid — 크레딧 지급', () => {
  it('Basic 단건 결제 → purchase_basic +3 지급, 멱등 키는 order.paid:<order.id>', async () => {
    const res = await POST(signedWebhookRequest(orderPaidPayload({ orderId: 'order_A' })))
    expect(res.status).toBe(200)

    const grants = admin.rpcCalls.filter((c) => c.name === 'grant_purchase_credits')
    expect(grants).toHaveLength(1)
    expect(grants[0].params).toMatchObject({
      p_event_id: 'order.paid:order_A',
      p_event_type: 'order.paid',
      p_user_id: 'user-uuid-1',
      p_delta: 3,
      p_reason: 'purchase_basic',
      p_ref_id: 'order_A',
    })
    expect(admin.balance('user-uuid-1')).toBe(3)
  })

  it('Pro 결제 → purchase_pro +10', async () => {
    await POST(
      signedWebhookRequest(
        orderPaidPayload({ orderId: 'order_P', productId: process.env.POLAR_PRODUCT_ID_PRO! }),
      ),
    )
    expect(admin.state.ledger).toHaveLength(1)
    expect(admin.state.ledger[0]).toMatchObject({ delta: 10, reason: 'purchase_pro' })
  })

  it('같은 order.paid 이벤트 2번 도착 → 크레딧은 정확히 1번만 지급 (webhook_events 멱등성)', async () => {
    const payload = orderPaidPayload({ orderId: 'order_DUP' })
    const res1 = await POST(signedWebhookRequest(payload))
    const res2 = await POST(signedWebhookRequest(payload))

    // 두 번 모두 200 (중복은 에러가 아니라 정상 스킵 — Polar 재전송 루프 방지)
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    // 원장에는 +3 한 행만
    expect(admin.state.ledger).toHaveLength(1)
    expect(admin.balance('user-uuid-1')).toBe(3)
  })
})

describe('order.paid — 구독 billingReason 분기', () => {
  const sub = (billingReason: 'subscription_create' | 'subscription_cycle' | 'subscription_update', orderId: string) =>
    orderPaidPayload({
      orderId,
      productId: process.env.POLAR_SUBSCRIPTION_ID_BASIC!,
      billingReason,
      subscriptionId: 'sub_1',
    })

  it('subscription_create → subscription_monthly +4 지급', async () => {
    await POST(signedWebhookRequest(sub('subscription_create', 'order_S1')))
    expect(admin.state.ledger).toHaveLength(1)
    expect(admin.state.ledger[0]).toMatchObject({ delta: 4, reason: 'subscription_monthly' })
  })

  it('subscription_cycle(갱신 결제) → subscription_monthly +4 지급', async () => {
    await POST(signedWebhookRequest(sub('subscription_cycle', 'order_S2')))
    expect(admin.balance('user-uuid-1')).toBe(4)
  })

  it('subscription_update(비례정산) → 지급 안 함, RPC 미호출', async () => {
    const res = await POST(signedWebhookRequest(sub('subscription_update', 'order_S3')))
    expect(res.status).toBe(200)
    expect(admin.rpcCalls.filter((c) => c.name === 'grant_purchase_credits')).toHaveLength(0)
    expect(admin.state.ledger).toHaveLength(0)
  })

  it('갱신 주문에 metadata.user_id 누락 → subscriptions 미러 역조회 폴백으로 지급', async () => {
    // 구독 상태 미러에 소유자 기록이 있는 상황
    admin.state.subscriptions.set('sub_1', {
      polar_subscription_id: 'sub_1',
      user_id: 'fallback-user-9',
      polar_customer_id: 'cus_1',
      product_id: process.env.POLAR_SUBSCRIPTION_ID_BASIC!,
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: null,
      started_at: null,
      ends_at: null,
      polar_modified_at: null,
    })

    const payload = orderPaidPayload({
      orderId: 'order_S4',
      productId: process.env.POLAR_SUBSCRIPTION_ID_BASIC!,
      billingReason: 'subscription_cycle',
      subscriptionId: 'sub_1',
      userId: null, // metadata 누락
    })
    const res = await POST(signedWebhookRequest(payload))
    expect(res.status).toBe(200)
    expect(admin.balance('fallback-user-9')).toBe(4)
    expect(sendAlertEmail).not.toHaveBeenCalled()
  })

  it('갱신 주문 metadata 누락 + 역조회도 실패 → 지급 없음 + 운영자 알림, 200', async () => {
    const payload = orderPaidPayload({
      orderId: 'order_S5',
      productId: process.env.POLAR_SUBSCRIPTION_ID_BASIC!,
      billingReason: 'subscription_cycle',
      subscriptionId: 'sub_unknown',
      userId: null,
    })
    const res = await POST(signedWebhookRequest(payload))
    expect(res.status).toBe(200) // 재시도해도 해소 안 됨 — 200으로 종료(수동 지급 경로)
    expect(admin.state.ledger).toHaveLength(0)
    expect(sendAlertEmail).toHaveBeenCalledTimes(1)
  })
})

describe('order.paid — 실패 경로', () => {
  it('상품 ID 매핑 실패(구상품 등) → 200 반환하되 지급 없음 + 알림', async () => {
    const res = await POST(
      signedWebhookRequest(orderPaidPayload({ orderId: 'order_X', productId: 'prod_legacy_unknown' })),
    )
    expect(res.status).toBe(200)
    expect(admin.rpcCalls.filter((c) => c.name === 'grant_purchase_credits')).toHaveLength(0)
    expect(admin.state.ledger).toHaveLength(0)
    expect(sendAlertEmail).toHaveBeenCalledTimes(1)
  })

  it('서명 검증 실패 → 403, RPC·원장 접근 자체가 없음', async () => {
    const res = await POST(signedWebhookRequest(orderPaidPayload(), { tamper: true }))
    expect(res.status).toBe(403)
    expect(admin.rpcCalls).toHaveLength(0)
  })

  it('잘못된 시크릿으로 서명된 요청 → 403', async () => {
    const res = await POST(signedWebhookRequest(orderPaidPayload(), { secret: 'wrong-secret' }))
    expect(res.status).toBe(403)
    expect(admin.rpcCalls).toHaveLength(0)
  })

  it('지급 RPC 실패 → 에러 re-throw (Polar 재시도 경로) + 알림', async () => {
    admin.forceRpcError('grant_purchase_credits', 'db down')
    await expect(POST(signedWebhookRequest(orderPaidPayload({ orderId: 'order_E' })))).rejects.toMatchObject(
      { message: 'db down' },
    )
    expect(admin.state.ledger).toHaveLength(0)
    expect(sendAlertEmail).toHaveBeenCalledTimes(1)
  })
})
