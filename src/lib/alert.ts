import 'server-only'

// 운영자 이메일 알림 유틸.
// - RESEND_API_KEY 또는 ALERT_EMAIL 미설정 시 no-op (silently skip).
// - 내부 에러는 throw하지 않고 console.error만 — 알림 실패가 본 흐름을 막지 않도록.
// - 호출측에서 await 없이 fire-and-forget으로 사용 가능.

export async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL

  if (!apiKey || !to) return

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: 'f(방)정식 알림 <onboarding@resend.dev>',
      to,
      subject: `[f(방)정식] ${subject}`,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
    })

    if (error) {
      console.error('[alert] Resend error:', error)
    }
  } catch (err) {
    console.error('[alert] Failed to send alert email:', err)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
