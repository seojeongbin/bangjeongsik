"use client"

import BookIcon from "@/components/icons/BookIcon"

export default function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 w-full bg-white border-b border-[#E2EAF8]"
      style={{ height: "66px", boxShadow: "0 1px 6px rgba(26,86,219,0.06)" }}
    >
      <div className="mx-auto flex h-full max-w-5xl items-center px-4 sm:px-6">
        {/* 로고 */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <BookIcon className="w-12 h-12" />
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
              className="font-medium text-[#64748B]"
              style={{ fontSize: "9.5px", letterSpacing: "0" }}
            >
              숙소 입지부터 마진 계산까지, 당신 방의 수익을 위한 단 하나의 공식
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
