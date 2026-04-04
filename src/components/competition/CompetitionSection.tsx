"use client"

import { useState } from "react"
import Script from "next/script"
import { Search, MapPin, Loader2 } from "lucide-react"

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: { address: string; addressType: string; roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}

interface CompetitionResult {
  count: number
  label: string
  color: "green" | "yellow" | "red"
  data_updated_at: string
}

const LABEL_STYLES: Record<"green" | "yellow" | "red", { badge: string; chip: string; numColor: string }> = {
  green: {
    badge: "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]",
    chip: "bg-[#DCFCE7] text-[#15803D]",
    numColor: "#16A34A",
  },
  yellow: {
    badge: "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]",
    chip: "bg-[#FEF3C7] text-[#B45309]",
    numColor: "#D97706",
  },
  red: {
    badge: "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]",
    chip: "bg-[#FEE2E2] text-[#B91C1C]",
    numColor: "#DC2626",
  },
}

function formatDataDate(dateStr: string): string {
  if (!dateStr) return "2026년 3월 기준 공공데이터"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "2026년 3월 기준 공공데이터"
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 기준 공공데이터`
}

export default function CompetitionSection() {
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CompetitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openPostcode() {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete(data) {
        const selected = data.addressType === "R" ? data.roadAddress : data.jibunAddress
        setAddress(selected)
        setResult(null)
        setError(null)
      },
    }).open()
  }

  async function handleSearch() {
    if (!address) return
    setIsLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "조회에 실패했습니다.")
        return
      }
      setResult(json)
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const styles = result ? LABEL_STYLES[result.color] : null

  return (
    <>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <section className="w-full py-14 sm:py-16 bg-[#F0F5FF]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* 섹션 헤더 */}
          <div className="mb-8 flex flex-col gap-2">
            <div
              className="inline-flex items-center gap-2 self-start bg-white border border-[#BDD0F5] text-[#1a56db] font-bold"
              style={{ fontSize: "12px", padding: "5px 14px", borderRadius: "9999px", boxShadow: "0 2px 8px rgba(26,86,219,0.10)" }}
            >
              <MapPin size={12} strokeWidth={2.5} />
              경쟁 분석
            </div>
            <h2
              className="font-black text-[#0F172A]"
              style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", lineHeight: "1.2", letterSpacing: "-0.04em" }}
            >
              반경 500m 내{" "}
              <span className="bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent">
                경쟁 숙소
              </span>
              는 몇 개?
            </h2>
            <p className="text-[#64748B]" style={{ fontSize: "15px", lineHeight: "1.7" }}>
              공공데이터 외국인관광도시민박업 인허가 기준으로 주변 경쟁 강도를 분석합니다.
            </p>
          </div>

          {/* 입력 카드 */}
          <div
            className="bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* 주소 인풋 — div로 감싸서 터치 영역 확보 */}
              <div
                role="button"
                tabIndex={0}
                onClick={openPostcode}
                onKeyDown={(e) => e.key === "Enter" && openPostcode()}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-[11px] border-[1.5px] border-[#CBD5E1] bg-white px-4"
                style={{ height: "50px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", touchAction: "manipulation" }}
              >
                <MapPin size={16} className="shrink-0 text-[#94A3B8]" />
                <span
                  className="flex-1 select-none truncate"
                  style={{ fontSize: "15px", color: address ? "#0F172A" : "#9CA3AF" }}
                >
                  {address || "주소를 검색해 주세요"}
                </span>
              </div>

              {/* 주소 검색 버튼 */}
              <button
                type="button"
                onClick={openPostcode}
                className="shrink-0 cursor-pointer font-bold text-[#1a56db] rounded-[11px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF]"
                style={{ fontSize: "14px", padding: "12px 18px", height: "50px", touchAction: "manipulation" }}
              >
                <Search size={14} className="inline mr-1.5 -mt-0.5" />
                주소 검색
              </button>
            </div>

            {/* 조회 버튼 */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={!address || isLoading}
              className="mt-3 w-full cursor-pointer font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-[11px]"
              style={{
                background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                fontSize: "15px",
                padding: "13px 26px",
                boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
                touchAction: "manipulation",
              }}
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  조회 중...
                </span>
              ) : (
                "주변 경쟁 숙소 조회 →"
              )}
            </button>

            {/* 에러 메시지 */}
            {error && (
              <p className="mt-3 text-center text-sm text-[#DC2626]">{error}</p>
            )}
          </div>

          {/* 결과 카드 */}
          {result && styles && (
            <div
              className="mt-5 bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              {/* 결과 상단: 아이콘 + 경쟁강도 뱃지 */}
              <div className="mb-4 flex items-center justify-between">
                <div
                  className="flex items-center justify-center rounded-[11px]"
                  style={{ width: "38px", height: "38px", background: "#EEF4FF" }}
                >
                  <MapPin size={18} className="text-[#1a56db]" />
                </div>
                <span
                  className={`rounded-full font-bold ${styles.badge}`}
                  style={{ fontSize: "11px", padding: "3px 10px" }}
                >
                  {result.label}
                </span>
              </div>

              {/* 메인 수치 */}
              <p className="mb-1 text-[#64748B]" style={{ fontSize: "12px" }}>
                반경 500m 내 등록 민박
              </p>
              <div className="flex items-end gap-2 mb-4">
                <span
                  className="font-black"
                  style={{ fontSize: "1.85rem", lineHeight: "1", letterSpacing: "-0.04em", color: styles.numColor }}
                >
                  {result.count}
                </span>
                <span className="mb-1 font-bold text-[#64748B]" style={{ fontSize: "16px" }}>개</span>
              </div>

              {/* 데이터 기준일 */}
              <div className="mb-4 flex items-center gap-1.5">
                <span
                  className="rounded-full bg-[#EEF4FF] px-3 py-1 font-semibold text-[#1a56db]"
                  style={{ fontSize: "12px" }}
                >
                  데이터 기준: {formatDataDate(result.data_updated_at)}
                </span>
              </div>

              {/* 면책 문구 */}
              <div
                className="mb-5 rounded-r-[12px] text-[#64748B]"
                style={{
                  background: "#F8FAFF",
                  borderLeft: "3px solid #93C5FD",
                  padding: "14px 18px",
                  fontSize: "12px",
                  lineHeight: "1.8",
                }}
              >
                공공데이터 인허가 기준 집계입니다. 실제 운영 중인 숙소 수와 다를 수 있으며,
                미등록 숙소(특례 사업자 포함)는 포함되지 않습니다.
                <br />
                특례 사업자는 공공데이터에 미등록된 경우가 많아 실제보다 적게 집계될 수 있습니다.
              </div>

              {/* 이메일 CTA */}
              <div
                className="flex flex-col items-center gap-3 rounded-[14px] border border-[#BDD0F5] bg-[#EEF4FF] p-4 text-center sm:flex-row sm:justify-between sm:text-left"
              >
                <p className="font-semibold text-[#0F172A]" style={{ fontSize: "14px" }}>
                  더 정밀한 분석을 원하시면
                  <span className="ml-1 text-[#1a56db]">실제 예약 데이터, 동네 평균 객단가</span>
                  까지 받아보세요.
                </p>
                <a
                  href="#waitlist"
                  className="shrink-0 cursor-pointer rounded-[11px] font-extrabold text-white"
                  style={{
                    background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                    fontSize: "14px",
                    padding: "10px 20px",
                    boxShadow: "0 4px 14px rgba(26,86,219,0.35)",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  출시 알림 신청 →
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
