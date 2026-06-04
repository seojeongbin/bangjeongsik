import * as Sentry from '@sentry/nextjs'
import { Webhooks } from '@polar-sh/nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendAlertEmail } from '@/lib/alert'

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    if (payload.type !== 'order.paid') return

    const order = payload.data
    const metadata = (order.metadata ?? {}) as Record<string, unknown>

    const address = typeof metadata.address === 'string' ? metadata.address : null
    const lat = typeof metadata.lat === 'number' ? metadata.lat : null
    const lng = typeof metadata.lng === 'number' ? metadata.lng : null

    if (!address) return

    try {
      // polar_order_id UNIQUE → 중복 웹훅 수신 시 무시 (ignoreDuplicates)
      const { error } = await supabaseAdmin
        .from('report_purchases')
        .upsert(
          {
            polar_order_id: order.id,
            checkout_id: (order as Record<string, unknown>).checkoutId as string ?? null,
            address,
            lat,
            lng,
            report_token: crypto.randomUUID(),
          },
          { onConflict: 'polar_order_id', ignoreDuplicates: true },
        )

      if (error) throw error
    } catch (err) {
      Sentry.captureException(err, {
        tags: { webhook: 'polar', event: 'order.paid' },
        extra: { polar_order_id: order.id, address },
      })
      void sendAlertEmail(
        '결제 웹훅 처리 실패',
        `Polar 웹훅(order.paid) 처리 중 DB upsert 실패.\n\npolar_order_id: ${order.id}\n주소: ${address ?? '(없음)'}\n\nSentry에서 상세 확인 후 수동으로 리포트 토큰을 발급해주세요.`,
      )
      // re-throw → Polar가 웹훅 재시도 (복구 경로)
      throw err
    }
  },
})
