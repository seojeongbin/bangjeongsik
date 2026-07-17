import { Webhook } from 'standardwebhooks'

/**
 * Polar 웹훅 테스트 페이로드 팩토리 + 실서명 헬퍼 (Phase 2-2J).
 *
 * 페이로드는 @polar-sh/sdk의 zod inbound 스키마(WebhookOrderPaidPayload /
 * WebhookSubscription*Payload)를 실제로 통과하는 최소 완전형 — 필드를 임의로
 * 지우면 서명이 맞아도 SDKValidationError로 실패한다.
 * 서명은 실제 standardwebhooks HMAC — @polar-sh/nextjs Webhooks()의
 * validateEvent가 그대로 검증하므로 서명 검증 경로까지 실 코드로 테스트된다.
 */

const NOW = '2026-07-17T00:00:00Z'

function customer() {
  return {
    id: 'cus_1',
    created_at: NOW,
    modified_at: null,
    metadata: {},
    external_id: null,
    email: 'test@example.com',
    email_verified: true,
    type: 'individual',
    name: null,
    billing_address: null,
    tax_id: null,
    organization_id: 'org_1',
    deleted_at: null,
    avatar_url: 'https://example.com/a.png',
  }
}

function product(productId: string, recurring: boolean) {
  return {
    id: productId,
    created_at: NOW,
    modified_at: null,
    name: 'Test Product',
    description: null,
    recurring_interval: recurring ? 'month' : null,
    recurring_interval_count: recurring ? 1 : null,
    trial_interval: null,
    trial_interval_count: null,
    visibility: 'public',
    is_recurring: recurring,
    is_archived: false,
    organization_id: 'org_1',
    metadata: {},
    prices: [],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
  }
}

export interface OrderOverrides {
  orderId?: string
  productId?: string
  /** null이면 metadata에서 user_id 제거 */
  userId?: string | null
  billingReason?: 'purchase' | 'subscription_create' | 'subscription_cycle' | 'subscription_update'
  subscriptionId?: string | null
  checkoutId?: string | null
}

/** order.paid 이벤트 페이로드 (스키마 통과 확인 완료) */
export function orderPaidPayload(o: OrderOverrides = {}) {
  const {
    orderId = 'order_1',
    productId = process.env.POLAR_PRODUCT_ID_BASIC!,
    userId = 'user-uuid-1',
    billingReason = 'purchase',
    subscriptionId = null,
    checkoutId = 'checkout_1',
  } = o

  return {
    type: 'order.paid',
    timestamp: NOW,
    data: {
      id: orderId,
      created_at: NOW,
      modified_at: null,
      status: 'paid',
      paid: true,
      subtotal_amount: 9900,
      discount_amount: 0,
      net_amount: 9900,
      tax_amount: 0,
      total_amount: 9900,
      applied_balance_amount: 0,
      due_amount: 0,
      refunded_amount: 0,
      refunded_tax_amount: 0,
      invoice_number: 'INV-1',
      platform_fee_amount: 0,
      platform_fee_currency: 'KRW',
      description: 'Test Order',
      currency: 'KRW',
      billing_reason: billingReason,
      billing_name: null,
      billing_address: null,
      is_invoice_generated: false,
      customer_id: 'cus_1',
      product_id: productId,
      discount_id: null,
      subscription_id: subscriptionId,
      checkout_id: checkoutId,
      metadata: userId === null ? {} : { user_id: userId },
      custom_field_data: {},
      customer: customer(),
      user_id: 'cus_1',
      product: product(productId, billingReason !== 'purchase'),
      discount: null,
      subscription: null,
      items: [],
    },
  }
}

export interface SubscriptionOverrides {
  eventType?:
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.active'
    | 'subscription.canceled'
    | 'subscription.uncanceled'
    | 'subscription.revoked'
    | 'subscription.past_due'
  subscriptionId?: string
  productId?: string
  /** null이면 metadata에서 user_id 제거 */
  userId?: string | null
  status?: string
  modifiedAt?: string | null
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: string | null
  endsAt?: string | null
}

/** subscription.* 이벤트 페이로드 (스키마 통과 확인 완료) */
export function subscriptionPayload(o: SubscriptionOverrides = {}) {
  const {
    eventType = 'subscription.updated',
    subscriptionId = 'sub_1',
    productId = process.env.POLAR_SUBSCRIPTION_ID_BASIC!,
    userId = 'user-uuid-1',
    status = 'active',
    modifiedAt = '2026-07-17T01:00:00Z',
    cancelAtPeriodEnd = false,
    currentPeriodEnd = '2026-08-17T00:00:00Z',
    endsAt = null,
  } = o

  return {
    type: eventType,
    timestamp: NOW,
    data: {
      id: subscriptionId,
      created_at: NOW,
      modified_at: modifiedAt,
      amount: 9900,
      currency: 'KRW',
      recurring_interval: 'month',
      recurring_interval_count: 1,
      status,
      current_period_start: NOW,
      current_period_end: currentPeriodEnd,
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: cancelAtPeriodEnd,
      canceled_at: null,
      started_at: NOW,
      ends_at: endsAt,
      ended_at: null,
      customer_id: 'cus_1',
      product_id: productId,
      discount_id: null,
      checkout_id: 'checkout_1',
      customer_cancellation_reason: null,
      customer_cancellation_comment: null,
      metadata: userId === null ? {} : { user_id: userId },
      custom_field_data: {},
      customer: customer(),
      user_id: 'cus_1',
      product: product(productId, true),
      discount: null,
      prices: [],
      meters: [],
      seats: null,
      pending_update: null,
    },
  }
}

let msgSeq = 0

/**
 * 실제 standardwebhooks HMAC으로 서명된 웹훅 Request 생성.
 * @polar-sh/sdk validateEvent는 secret을 utf-8 → base64로 감싸 검증하므로 동일하게 서명.
 */
export function signedWebhookRequest(
  payload: unknown,
  opts: { secret?: string; tamper?: boolean } = {},
): Request {
  const secret = opts.secret ?? process.env.POLAR_WEBHOOK_SECRET!
  const body = JSON.stringify(payload)
  const id = `msg_${++msgSeq}`
  const ts = new Date()
  const wh = new Webhook(Buffer.from(secret, 'utf-8').toString('base64'))
  let signature = wh.sign(id, ts, body)
  if (opts.tamper) {
    // 서명 앞부분을 훼손 — 검증 실패 케이스용
    signature = signature.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))
  }
  return new Request('http://localhost/api/webhooks/polar', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'webhook-signature': signature,
    },
    body,
  })
}
