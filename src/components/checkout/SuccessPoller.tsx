'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { PAYMENT } from '@/constants/messages'

interface Props {
  checkoutId: string
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 1500

export default function SuccessPoller({ checkoutId }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const attemptRef = useRef(0)

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>

    async function poll() {
      if (attemptRef.current >= MAX_ATTEMPTS) {
        setTimedOut(true)
        return
      }
      attemptRef.current += 1

      try {
        const res = await fetch(`/api/checkout/status?checkout_id=${encodeURIComponent(checkoutId)}`)
        const data: { token?: string; pending?: boolean } = await res.json()
        if (data.token) {
          setToken(data.token)
          return
        }
      } catch {
        // 네트워크 오류 무시하고 재시도
      }

      timerId = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timerId = setTimeout(poll, POLL_INTERVAL_MS)
    return () => clearTimeout(timerId)
  }, [checkoutId])

  // 토큰 확인 → 리포트 페이지로 이동
  useEffect(() => {
    if (token) {
      window.location.href = `/report/${token}`
    }
  }, [token])

  if (token) {
    return (
      <div className="text-center py-8">
        <Loader2 size={24} className="animate-spin text-[#1a56db] mx-auto mb-3" />
        <p className="text-[14px] text-[#64748B]">리포트 페이지로 이동 중...</p>
      </div>
    )
  }

  if (timedOut) {
    return (
      <div className="text-center py-8 space-y-4">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full"
          style={{ background: '#FEF3C7' }}
        >
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
        </div>
        <div>
          <p className="font-bold text-[#0F172A] mb-1" style={{ fontSize: '15px' }}>
            처리에 시간이 걸리고 있습니다
          </p>
          <p className="text-[#64748B]" style={{ fontSize: '13px', lineHeight: '1.7' }}>
            결제는 완료됐습니다. 잠시 후 이 페이지를 새로고침해 주세요.
            <br />
            계속 문제가 발생하면 아래 이메일로 문의해주세요.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-[11px] rounded-[11px] font-bold text-[14px] text-[#1a56db] border border-[#BDD0F5] bg-[#EEF4FF] hover:bg-[#E0EDFF] transition-colors"
          >
            페이지 새로고침
          </button>
          <a
            href={`mailto:${PAYMENT.contactEmail}?subject=리포트 발급 문의`}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-[11px] rounded-[11px] font-bold text-[14px] text-[#64748B] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFF] transition-colors"
          >
            이메일 문의
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-8 space-y-3">
      <Loader2 size={28} className="animate-spin text-[#1a56db] mx-auto" />
      <div>
        <p className="font-bold text-[#0F172A] mb-1" style={{ fontSize: '15px' }}>
          리포트를 생성하고 있습니다
        </p>
        <p className="text-[#64748B]" style={{ fontSize: '13px' }}>
          결제 확인 중... 최대 15초 소요될 수 있습니다.
        </p>
      </div>
    </div>
  )
}
