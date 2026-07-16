"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/browser"
import BookIcon from "@/components/icons/BookIcon"
import AuthButton from "@/components/auth/AuthButton"
import CreditBalance from "@/components/layout/CreditBalance"
import SubscriptionBadge from "@/components/layout/SubscriptionBadge"

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "분석하기" },
  { href: "/pricing", label: "가격" },
] as const

export default function Navbar() {
  const pathname = usePathname()
  // 마이페이지 링크는 로그인 시에만 노출 (Phase 2-2I)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const links = user ? [...NAV_LINKS, { href: "/mypage", label: "마이페이지" } as const] : NAV_LINKS

  return (
    <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#E4E7EC]">
      <div className="mx-auto flex h-full max-w-5xl items-center gap-1 px-3 sm:gap-3 sm:px-6">
        {/* 로고 — 단색 브랜드 (그라데이션 클립 폐기, DESIGN.md v4) */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <BookIcon className="hidden sm:block w-11 h-11" />
          <div className="flex flex-col leading-none">
            <span style={{ fontSize: "21px", lineHeight: "1.2" }}>
              <span style={{ fontSize: "11px", color: "#1D4ED8", fontWeight: 700 }}>f(</span>
              <span
                className="font-black text-[#1D4ED8]"
                style={{ fontSize: "21px", letterSpacing: "-0.04em" }}
              >
                방
              </span>
              <span style={{ fontSize: "11px", color: "#1D4ED8", fontWeight: 700 }}>)</span>
              <span
                className="font-black text-[#0F172A]"
                style={{ fontSize: "21px", letterSpacing: "-0.04em" }}
              >
                정식
              </span>
            </span>
            <span
              className="hidden md:block font-medium text-[#94A3B8]"
              style={{ fontSize: "9.5px", letterSpacing: "0" }}
            >
              숙소 입지부터 수익까지, 당신 방의 수익을 위한 단 하나의 공식
            </span>
          </div>
        </Link>

        {/* 메뉴 */}
        <nav className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-4">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[8px] px-2 py-1.5 sm:px-3 text-[13px] sm:text-[14px] font-bold whitespace-nowrap transition-colors ${
                  active
                    ? "text-[#1D4ED8] bg-[#EEF4FF]"
                    : "text-[#475569] hover:text-[#1D4ED8] hover:bg-[#F1F3F6]"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />
        <CreditBalance />
        <SubscriptionBadge />
        <AuthButton />
      </div>
    </header>
  )
}
