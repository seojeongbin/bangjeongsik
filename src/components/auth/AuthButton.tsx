"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/browser"

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogin = async (provider: "kakao" | "google") => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="h-8 w-[76px]" />
  }

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="rounded-[11px] border-[1.5px] border-[#CBD5E1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        로그아웃
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleLogin("kakao")}
        className="rounded-[11px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] px-2.5 py-1.5 text-[12px] font-bold text-[#1a56db]"
      >
        카카오 로그인
      </button>
      <button
        onClick={() => handleLogin("google")}
        className="rounded-[11px] border-[1.5px] border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        구글 로그인
      </button>
    </div>
  )
}
