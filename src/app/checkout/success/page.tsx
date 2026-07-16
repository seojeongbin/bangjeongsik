import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server-user'
import SuccessPoller from '@/components/checkout/SuccessPoller'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>
}) {
  const { checkout_id } = await searchParams

  if (!checkout_id) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-[#0F172A] mb-2">잘못된 접근입니다.</p>
          <Link href="/" className="text-[#1D4ED8] underline text-[14px]">홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  // 웹훅(크레딧 지급)이 이미 처리됐는지 즉시 확인
  const { data: event } = await supabaseAdmin
    .from('webhook_events')
    .select('event_id')
    .eq('checkout_id', checkout_id)
    .limit(1)
    .maybeSingle()

  // 지급 완료 시 현재 잔액 표시 (로그인 세션 기준, RLS)
  let balance: number | null = null
  if (event) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('get_my_credit_balance')
      if (typeof data === 'number') balance = data
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-white border border-[#E4E7EC] rounded-[20px] p-6 sm:p-8"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        {event ? (
          // 크레딧 지급 완료
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: '#DCFCE7' }}
            >
              <CheckCircle2 size={28} className="text-[#16A34A]" />
            </div>
            <div>
              <h1 className="font-black text-[#0F172A] mb-1" style={{ fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
                결제 완료
              </h1>
              <p className="text-[#64748B]" style={{ fontSize: '13px' }}>
                분석 크레딧이 지급됐습니다.
                {balance !== null && (
                  <>
                    {' '}현재 잔액 <strong className="text-[#0F172A]">{balance}회</strong>
                  </>
                )}
              </p>
            </div>
            <Link
              href="/explore"
              className="block w-full py-[14px] rounded-[12px] text-white font-extrabold text-[15px] text-center hover:opacity-90 transition-opacity"
              style={{
                background: '#1D4ED8',
                boxShadow: '0 8px 24px rgba(29,78,216,0.35)',
              }}
            >
              지도에서 분석 시작하기 →
            </Link>
            <p className="text-[11px] text-[#94A3B8]">
              크레딧은 로그인 계정에 귀속되며, 분석 1회당 1개가 차감됩니다.
            </p>
          </div>
        ) : (
          // 웹훅 미수신 — 클라이언트 폴링
          <>
            <div className="text-center mb-2">
              <div
                className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: '#DCFCE7' }}
              >
                <CheckCircle2 size={28} className="text-[#16A34A]" />
              </div>
              <h1 className="font-black text-[#0F172A]" style={{ fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
                결제 완료
              </h1>
            </div>
            <SuccessPoller checkoutId={checkout_id} />
          </>
        )}
      </div>
    </div>
  )
}
