"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function HeroSection() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus("loading")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.status === 409) {
        setStatus("already")
        return
      }
      if (!res.ok) throw new Error()
      setStatus("success")
      setEmail("")
    } catch {
      setStatus("error")
    }
  }

  return (
    <section
      id="waitlist"
      className="w-full py-14 sm:py-20"
      style={{
        background: "linear-gradient(155deg, #E8F0FF 0%, #F5F9FF 45%, #E8F5FF 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6">
        {/* 히어로 배지 */}
        <div
          className="inline-flex items-center gap-2 bg-white border border-[#BDD0F5] text-[#1a56db] font-bold"
          style={{
            fontSize: "12px",
            padding: "6px 16px",
            borderRadius: "9999px",
            boxShadow: "0 2px 8px rgba(26,86,219,0.10)",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: "7px",
              height: "7px",
              background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
              flexShrink: 0,
            }}
          />
          에어비앤비 창업 입지 분석 서비스
        </div>

        {/* 메인 카피 */}
        <div className="flex flex-col gap-3">
          <h1
            className="font-black text-[#0F172A]"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: "1.2",
              letterSpacing: "-0.04em",
            }}
          >
            에어비앤비 창업,
            <br />
            <span className="bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent">
              어디서 시작할지 모르겠다면
            </span>
          </h1>
          <p
            className="mx-auto max-w-xl text-[#64748B]"
            style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", lineHeight: "1.8" }}
          >
            동네별 수익 데이터와 리스크를 10초 안에 분석해드립니다.
            <br />
            출시 알림을 받고 가장 먼저 사용해보세요.
          </p>
        </div>

        {/* 히어로 이메일 박스 */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md"
        >
          {status === "success" ? (
            <div
              className="flex items-center justify-center gap-2 rounded-[14px] border border-[#BBF7D0] bg-[#F0FDF4] px-6 py-4 text-[#16A34A] font-bold"
              style={{ fontSize: "15px" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 4.5" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              등록 완료! 출시 시 알림을 보내드릴게요.
            </div>
          ) : (
            <div
              className="flex items-center gap-0 bg-white border border-[#BDD0F5] rounded-[14px]"
              style={{
                padding: "5px 5px 5px 18px",
                boxShadow: "0 4px 20px rgba(26,86,219,0.10)",
              }}
            >
              <Input
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
                className="flex-1 border-none bg-transparent shadow-none outline-none ring-0 focus-visible:ring-0 placeholder:text-[#9CA3AF] text-[#0F172A]"
                style={{ fontSize: "15px", height: "44px", padding: 0 }}
              />
              <Button
                type="submit"
                disabled={status === "loading"}
                className="shrink-0 cursor-pointer border-none font-extrabold text-white"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                  fontSize: "15px",
                  padding: "13px 22px",
                  borderRadius: "11px",
                  boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
                  height: "44px",
                }}
              >
                {status === "loading" ? "등록 중..." : "출시 알림 받기 →"}
              </Button>
            </div>
          )}
          {status === "already" && (
            <p className="mt-2 text-center text-sm text-[#1a56db]">
              이미 등록된 이메일입니다.
            </p>
          )}
          {status === "error" && (
            <p className="mt-2 text-center text-sm text-[#DC2626]">
              오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}
        </form>

        {/* 소셜 프루프 */}
        <p className="text-[#94A3B8] font-medium text-center" style={{ fontSize: "13px" }}>
          지금 이 순간에도{" "}
          <span className="text-[#1a56db] font-bold">경쟁자들은 준비 중</span>입니다.
          <br />
          <span className="inline-flex items-center gap-1 text-[#1a56db] font-bold mt-1">
            <Bell size={13} strokeWidth={2.5} />
            가장 먼저 알림 받기
          </span>
        </p>
        <p
          className="block sm:hidden text-center font-semibold text-[#111827]"
          style={{ fontSize: "13px" }}
        >
          "에어비앤비 창업을 준비하다가 답답해서 직접 만들었습니다"
        </p>
      </div>
    </section>
  )
}
