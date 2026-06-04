import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/server'
import SuccessPoller from '@/components/checkout/SuccessPoller'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>
}) {
  const { checkout_id } = await searchParams

  if (!checkout_id) {
    return (
      <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-[#0F172A] mb-2">잘못된 접근입니다.</p>
          <Link href="/" className="text-[#1a56db] underline text-[14px]">홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  // 웹훅이 이미 처리됐는지 즉시 확인
  const { data } = await supabaseAdmin
    .from('report_purchases')
    .select('report_token, address')
    .eq('checkout_id', checkout_id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-white border border-[#E2EAF8] rounded-[20px] p-6 sm:p-8"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        {data?.report_token ? (
          // 토큰 발급 완료 — 즉시 링크 제공
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
              {data.address && (
                <p className="text-[#64748B]" style={{ fontSize: '13px' }}>
                  {data.address} 리포트가 준비됐습니다.
                </p>
              )}
            </div>
            <Link
              href={`/report/${data.report_token}`}
              className="block w-full py-[14px] rounded-[12px] text-white font-extrabold text-[15px] text-center hover:opacity-90 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
                boxShadow: '0 8px 24px rgba(26,86,219,0.35)',
              }}
            >
              리포트 열람하기 →
            </Link>
            <p className="text-[11px] text-[#94A3B8]">
              이 URL을 북마크해두면 365일간 재열람 가능합니다.
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
