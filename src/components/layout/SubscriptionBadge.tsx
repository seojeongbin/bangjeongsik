'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser'

interface SubInfo {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

function formatKoDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Navbar 구독 상태 배지 (Phase 2-2H). CreditBalance와 동일 원칙 —
 * 구독 중일 때만 노출, 비로그인·비구독·조회 실패 시 아무것도 렌더링하지 않음.
 */
export default function SubscriptionBadge() {
  const [user, setUser] = useState<User | null>(null)
  const [sub, setSub] = useState<SubInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/subscription')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscription?: SubInfo | null } | null) => {
        if (!cancelled && data?.subscription) setSub(data.subscription)
      })
      .catch(() => {
        // 부가 정보 — 실패해도 조용히 무시(배지 생략)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user || !sub) return null

  const tooltip = sub.cancelAtPeriodEnd
    ? `해지 예약됨 · ${formatKoDate(sub.currentPeriodEnd)}까지 유지`
    : sub.status === 'past_due'
      ? '결제 실패 · 결제수단을 확인해주세요'
      : `다음 갱신일: ${formatKoDate(sub.currentPeriodEnd)}`

  return (
    <div
      title={tooltip}
      className="flex items-center gap-1.5 rounded-full border border-[#BDD0F5] bg-[#EEF4FF] px-2.5 py-1.5 mr-2 flex-shrink-0"
    >
      <RefreshCw size={12} className="text-[#1D4ED8]" />
      <span className="hidden sm:inline text-[12px] font-bold text-[#1D4ED8] whitespace-nowrap">
        구독 중
      </span>
    </div>
  )
}
