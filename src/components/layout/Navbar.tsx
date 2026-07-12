"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import BookIcon from "@/components/icons/BookIcon"
import AuthButton from "@/components/auth/AuthButton"
import CreditBalance from "@/components/layout/CreditBalance"

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "분석하기" },
  { href: "/pricing", label: "가격" },
] as const

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white border-b border-[#E2EAF8]"
      style={{ height: "66px", boxShadow: "0 1px 6px rgba(26,86,219,0.06)" }}
    >
      <div className="mx-auto flex h-full max-w-5xl items-center gap-1 px-3 sm:gap-3 sm:px-6">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <BookIcon className="hidden sm:block w-12 h-12" />
          <div className="flex flex-col leading-none">
            <span style={{ fontSize: "21px", lineHeight: "1.2" }}>
              <span style={{ fontSize: "11px", color: "#1a56db", fontWeight: 700 }}>f(</span>
              <span
                className="font-black bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent"
                style={{ fontSize: "21px", letterSpacing: "-0.04em" }}
              >
                방
              </span>
              <span style={{ fontSize: "11px", color: "#1a56db", fontWeight: 700 }}>)</span>
              <span
                className="font-black text-[#0F172A]"
                style={{ fontSize: "21px", letterSpacing: "-0.04em" }}
              >
                정식
              </span>
            </span>
            <span
              className="hidden md:block font-medium text-[#64748B]"
              style={{ fontSize: "9.5px", letterSpacing: "0" }}
            >
              숙소 입지부터 수익까지, 당신 방의 수익을 위한 단 하나의 공식
            </span>
          </div>
        </Link>

        {/* 메뉴 */}
        <nav className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-4">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[9px] px-2 py-1.5 sm:px-3 text-[13px] sm:text-[14px] font-bold whitespace-nowrap transition-colors ${
                  active
                    ? "text-[#1a56db] bg-[#EEF4FF]"
                    : "text-[#475569] hover:text-[#1a56db] hover:bg-[#F8FAFF]"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />
        <CreditBalance />
        <AuthButton />
      </div>
    </header>
  )
}
