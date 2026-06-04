import { Webhooks } from '@polar-sh/nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'

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

    // polar_order_id UNIQUE → 중복 웹훅 수신 시 무시 (ignoreDuplicates)
    await supabaseAdmin
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
  },
})
