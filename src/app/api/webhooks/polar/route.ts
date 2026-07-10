import * as Sentry from '@sentry/nextjs'
import { Webhooks } from '@polar-sh/nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendAlertEmail } from '@/lib/alert'

/**
 * Polar 웹훅 (Phase 2-2B): order.paid → 크레딧 지급.
 * report_token 발급 없음 — 리포트 생성은 분석 실행 시점(크레딧 차감)에 발생.
 * 멱등성: grant_purchase_credits RPC가 webhook_events(event_id UNIQUE) 검사와
 * 크레딧 INSERT를 단일 트랜잭션으로 처리 → 중복 수신에도 지급은 정확히 1회.
 */
const PLAN_CREDITS: Record<string, { delta: number; reason: string }> = {
  basic: { delta: 3, reason: 'purchase_basic' },
  pro: { delta: 10, reason: 'purchase_pro' },
}

function resolvePlan(productId: string | null): 'basic' | 'pro' | null {
  if (!productId) return null
  if (productId === process.env.POLAR_PRODUCT_ID_BASIC) return 'basic'
  if (productId === process.env.POLAR_PRODUCT_ID_PRO) return 'pro'
  return null
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    if (payload.type !== 'order.paid') return

    const order = payload.data
    const metadata = (order.metadata ?? {}) as Record<string, unknown>
    const userId = typeof metadata.user_id === 'string' ? metadata.user_id : null
    const plan = resolvePlan(order.productId)

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
  },
})
