'use client'

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser'
import { CREDITS_CHANGED_EVENT } from '@/lib/creditsEvent'

/**
 * Navbar 상시 크레딧 잔액 표시 (2026-07-11). 로그인 상태일 때만 노출,
 * 비로그인 시 아무것도 렌더링하지 않음(로그인 유도는 옆의 AuthButton이 담당).
 * 분석 실행·결제 완료 등 잔액이 바뀌는 액션 이후에는 CREDITS_CHANGED_EVENT로 갱신.
 */
export default function CreditBalance() {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // 비로그인이면 조회하지 않음 — 렌더링에서 !user일 때 이미 숨김 처리됨
    if (!user) return
    fetch('/api/credits/balance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { balance?: number } | null) => {
        if (data && typeof data.balance === 'number') setBalance(data.balance)
      })
      .catch(() => {
        // 부가 정보 — 실패해도 조용히 무시(기존 값 유지)
      })
  }, [user])

  useEffect(() => {
    function handleChanged(e: Event) {
      const detail = (e as CustomEvent<{ balance?: number }>).detail
      if (typeof detail?.balance === 'number') {
        setBalance(detail.balance)
        return
      }
      fetch('/api/credits/balance')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { balance?: number } | null) => {
          if (data && typeof data.balance === 'number') setBalance(data.balance)
        })
        .catch(() => {})
    }
    window.addEventListener(CREDITS_CHANGED_EVENT, handleChanged)
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handleChanged)
  }, [])

  if (!user || balance === null) return null

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#BDD0F5] bg-[#EEF4FF] px-2.5 py-1.5 mr-2 flex-shrink-0">
      <Coins size={13} className="text-[#1D4ED8]" />
      <span className="text-[12px] font-bold text-[#1D4ED8] whitespace-nowrap">
        <span className="hidden sm:inline">보유 크레딧 </span>
        {balance}회
      </span>
    </div>
  )
}
