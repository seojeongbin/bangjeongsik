"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface EmailCTAProps {
  variant?: "inline" | "banner"
  message?: string
}

const SESSION_KEY = "waitlist_registered"

export default function EmailCTA({
  variant = "inline",
  message = "더 정밀한 분석을 원하시면",
}: EmailCTAProps) {
  const [email, setEmail] = useState("")
  const [registered, setRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "true") {
      setRegistered(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok || res.status === 409) {
        sessionStorage.setItem(SESSION_KEY, "true")
        setRegistered(true)
        return
      }
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? "등록에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  if (registered) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-[14px] font-semibold text-[#15803D] ${
          variant === "banner"
            ? "bg-[#DCFCE7] border border-[#BBF7D0] py-4 px-6"
            : "bg-[#DCFCE7] border border-[#BBF7D0] py-3 px-5"
        }`}
        style={{ fontSize: "14px" }}
      >
        <span style={{ fontSize: "16px" }}>✓</span>
        출시 알림 신청 완료
      </div>
    )
  }

  if (variant === "banner") {
    return (
      <div className="rounded-[18px] border border-[#BDD0F5] bg-[#EEF4FF] p-4 sm:p-6">
        <p className="mb-1 text-center font-semibold text-[#0F172A]" style={{ fontSize: "15px" }}>
          {message}
        </p>
        <p className="mb-4 text-center font-semibold text-[#1a56db]" style={{ fontSize: "15px" }}>
          출시 알림을 신청하면 가장 먼저 받아보실 수 있습니다.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소 입력"
            required
            className="w-full sm:flex-1 rounded-[11px] border-[1.5px] border-[#CBD5E1] bg-white px-4 text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#1a56db] focus:outline-none"
            style={{ fontSize: "15px", height: "48px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full sm:w-auto sm:shrink-0 cursor-pointer rounded-[11px] font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
              fontSize: "15px",
              padding: "0 24px",
              height: "48px",
              boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
              touchAction: "manipulation",
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                신청 중...
              </span>
            ) : (
              "출시 알림 신청 →"
            )}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-center text-sm text-[#DC2626]">{error}</p>
        )}
      </div>
    )
  }

  // variant === "inline"
  return (
    <div className="rounded-[14px] border border-[#BDD0F5] bg-[#EEF4FF] p-4">
      <p className="mb-3 font-semibold text-[#0F172A]" style={{ fontSize: "14px" }}>
        {message}{" "}
        <span className="text-[#1a56db]">실제 예약 데이터, 동네 평균 객단가</span>까지 받아보세요.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소 입력"
          required
          className="flex-1 rounded-[10px] border-[1.5px] border-[#CBD5E1] bg-white px-3 text-[#0F172A] placeholder:text-[#9CA3AF] focus:border-[#1a56db] focus:outline-none"
          style={{ fontSize: "14px", height: "42px" }}
        />
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="shrink-0 cursor-pointer rounded-[10px] font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
            fontSize: "14px",
            padding: "0 18px",
            height: "42px",
            boxShadow: "0 4px 14px rgba(26,86,219,0.35)",
            touchAction: "manipulation",
          }}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              신청 중...
            </span>
          ) : (
            "신청 →"
          )}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-[#DC2626]">{error}</p>
      )}
    </div>
  )
}
