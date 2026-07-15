import * as Sentry from '@sentry/nextjs'
import { Webhooks } from '@polar-sh/nextjs'
import type { Order } from '@polar-sh/sdk/models/components/order'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendAlertEmail } from '@/lib/alert'

/**
 * Polar 웹훅 (Phase 2-2B + 2-2H).
 * - order.paid → 크레딧 지급 (단건 + 구독 주기 결제 공통).
 *   구독 크레딧도 여기서만 지급 — 실제 결제가 잡힌 이벤트이므로
 *   "결제 실패/연체 시 크레딧 미지급"이 자동 충족되고, order.id 기반
 *   기존 멱등성(grant_purchase_credits + webhook_events)이 주기별
 *   중복 지급을 막는다 (주기마다 새 order가 생성됨).
 * - subscription.* → subscriptions 상태 미러 동기화만 (지급 없음).
 *   취소/해지 시에도 이미 지급된 크레딧은 회수하지 않는다 (원장 불변).
 * report_token 발급 없음 — 리포트 생성은 분석 실행 시점(크레딧 차감)에 발생.
 */
const PLAN_CREDITS: Record<string, { delta: number; reason: string }> = {
  basic: { delta: 3, reason: 'purchase_basic' },
  pro: { delta: 10, reason: 'purchase_pro' },
  // 월간 Basic 구독: 주기당 3회 + 무료 1회 = 4회 (PRD_phase2-2H_subscription.md)
  sub_basic: { delta: 4, reason: 'subscription_monthly' },
}

/** subscriptions.status CHECK 제약과 일치해야 함 (20260715000001) */
const KNOWN_SUB_STATUSES = new Set([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
])

function resolvePlan(productId: string | null): 'basic' | 'pro' | 'sub_basic' | null {
  if (!productId) return null
  if (productId === process.env.POLAR_PRODUCT_ID_BASIC) return 'basic'
  if (productId === process.env.POLAR_PRODUCT_ID_PRO) return 'pro'
  if (productId === process.env.POLAR_SUBSCRIPTION_ID_BASIC) return 'sub_basic'
  return null
}

function metadataUserId(metadata: Record<string, unknown> | undefined | null): string | null {
  const value = (metadata ?? {})['user_id']
  return typeof value === 'string' ? value : null
}

async function handleOrderPaid(order: Order) {
  const plan = resolvePlan(order.productId)
  let userId = metadataUserId(order.metadata as Record<string, unknown>)

  // 구독 주기 결제: metadata 누락 대비 폴백 — 구독 상태 미러에서 소유자 역조회
  if (!userId && plan === 'sub_basic' && order.subscriptionId) {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('polar_subscription_id', order.subscriptionId)
      .maybeSingle()
    userId = data?.user_id ?? null
  }

  // 구독의 중간 변경(업그레이드 등) 비례정산 주문 — 지급 대상 아님
  if (plan === 'sub_basic' && order.billingReason === 'subscription_update') {
    return
  }

  // 매핑 불가(구상품 주문·user_id 누락 등) — 재시도해도 해소 안 되므로 알림만
  if (!userId || !plan) {
    Sentry.captureMessage('Polar order.paid 크레딧 매핑 실패', {
      level: 'error',
      tags: { webhook: 'polar', event: 'order.paid' },
      extra: { polar_order_id: order.id, product_id: order.productId, has_user_id: !!userId },
    })
    void sendAlertEmail(
      '결제 웹훅 크레딧 매핑 실패',
      `Polar 웹훅(order.paid)에서 상품/사용자 매핑에 실패했습니다.\n\npolar_order_id: ${order.id}\nproduct_id: ${order.productId ?? '(없음)'}\nuser_id: ${userId ?? '(없음)'}\n\nSentry 확인 후 수동으로 크레딧을 지급해주세요.`,
    )
    return
  }

  const { delta, reason } = PLAN_CREDITS[plan]

  try {
    const { data, error } = await supabaseAdmin.rpc('grant_purchase_credits', {
      p_event_id: `order.paid:${order.id}`,
      p_event_type: 'order.paid',
      p_checkout_id: order.checkoutId ?? null,
      p_user_id: userId,
      p_delta: delta,
      p_reason: reason,
      p_ref_id: order.id,
    })

    if (error) throw error
    // data === false → 중복 웹훅(이미 지급됨) — 정상 종료
    void data
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: 'polar', event: 'order.paid' },
      extra: { polar_order_id: order.id, user_id: userId, plan },
    })
    void sendAlertEmail(
      '결제 웹훅 크레딧 지급 실패',
      `Polar 웹훅(order.paid) 크레딧 지급 RPC 실패.\n\npolar_order_id: ${order.id}\nuser_id: ${userId}\nplan: ${plan}\n\nSentry에서 상세 확인해주세요. Polar가 자동 재시도합니다.`,
    )
    // re-throw → Polar가 웹훅 재시도 (복구 경로)
    throw err
  }
}

async function handleSubscriptionEvent(eventType: string, sub: Subscription) {
  // 다른 구독 상품(미래 추가분 포함)만 반영 대상 — 알 수 없는 상품은 알림만
  const plan = resolvePlan(sub.productId)
  if (plan !== 'sub_basic') {
    Sentry.captureMessage('Polar 구독 웹훅 상품 매핑 실패', {
      level: 'warning',
      tags: { webhook: 'polar', event: eventType },
      extra: { polar_subscription_id: sub.id, product_id: sub.productId },
    })
    return
  }

  const status = typeof sub.status === 'string' ? sub.status : String(sub.status)
  if (!KNOWN_SUB_STATUSES.has(status)) {
    // CHECK 제약 위반으로 영구 재시도 루프에 빠지지 않도록 스킵 + 알림
    Sentry.captureMessage('Polar 구독 웹훅 알 수 없는 status', {
      level: 'error',
      tags: { webhook: 'polar', event: eventType },
      extra: { polar_subscription_id: sub.id, status },
    })
    void sendAlertEmail(
      '구독 웹훅 알 수 없는 status',
      `Polar 구독 웹훅(${eventType})에서 알 수 없는 status를 수신했습니다.\n\npolar_subscription_id: ${sub.id}\nstatus: ${status}\n\nsubscriptions.status CHECK 제약 확장이 필요할 수 있습니다.`,
    )
    return
  }

  const userId = metadataUserId(sub.metadata as Record<string, unknown>)

  try {
    const { data, error } = await supabaseAdmin.rpc('upsert_subscription_state', {
      p_polar_subscription_id: sub.id,
      p_user_id: userId,
      p_polar_customer_id: sub.customerId,
      p_product_id: sub.productId,
      p_status: status,
      p_cancel_at_period_end: sub.cancelAtPeriodEnd,
      p_current_period_end: sub.currentPeriodEnd?.toISOString() ?? null,
      p_started_at: sub.startedAt?.toISOString() ?? null,
      p_ends_at: sub.endsAt?.toISOString() ?? null,
      p_polar_modified_at: (sub.modifiedAt ?? sub.createdAt)?.toISOString() ?? null,
    })

    if (error) throw error

    // 신규 구독인데 user_id 식별 불가 — 상태 미러 결손, 수동 매핑 필요
    if (data === 'no_user_skipped') {
      Sentry.captureMessage('Polar 구독 웹훅 user_id 누락', {
        level: 'error',
        tags: { webhook: 'polar', event: eventType },
        extra: { polar_subscription_id: sub.id, customer_id: sub.customerId },
      })
      void sendAlertEmail(
        '구독 웹훅 user_id 누락',
        `Polar 구독 웹훅(${eventType})에서 metadata.user_id가 없어 구독 상태를 기록하지 못했습니다.\n\npolar_subscription_id: ${sub.id}\npolar_customer_id: ${sub.customerId}\n\n크레딧 지급(order.paid)과 별개이며, 구독 상태 표시·포털 연결이 안 될 수 있습니다.`,
      )
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: 'polar', event: eventType },
      extra: { polar_subscription_id: sub.id, user_id: userId },
    })
    // re-throw → Polar가 웹훅 재시도 (상태 동기화 복구 경로)
    throw err
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    switch (payload.type) {
      case 'order.paid':
        return handleOrderPaid(payload.data)
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
      case 'subscription.canceled':
      case 'subscription.uncanceled':
      case 'subscription.revoked':
      case 'subscription.past_due':
        return handleSubscriptionEvent(payload.type, payload.data)
      default:
        return
    }
  },
})
