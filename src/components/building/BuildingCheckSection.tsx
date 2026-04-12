"use client"

import { useState } from "react"
import { Building2, MapPin, Loader2, Phone, ExternalLink } from "lucide-react"
import EmailCTA from "@/components/common/EmailCTA"

interface BuildingResult {
  result: "possible" | "difficult" | "unknown"
  label: string
  color: "green" | "yellow" | "gray"
  buildingPurpose: string
  floors: string
  approvalDate: string
  district: string
  checkedAt: string
}

const BADGE_STYLES: Record<"green" | "yellow" | "gray", string> = {
  green: "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]",
  yellow: "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]",
  gray: "bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]",
}

const ICON_BG: Record<"green" | "yellow" | "gray", string> = {
  green: "#DCFCE7",
  yellow: "#FEF3C7",
  gray: "#F1F5F9",
}

const ICON_COLOR: Record<"green" | "yellow" | "gray", string> = {
  green: "#16A34A",
  yellow: "#D97706",
  gray: "#64748B",
}

const DISTRICT_INFO: Record<string, { url: string; phone: string; dept: string }> = {
  "강남구": { url: "https://www.gangnam.go.kr", phone: "02-3423-5552", dept: "관광진흥과" },
  "강동구": { url: "https://www.gangdong.go.kr", phone: "02-3425-5253", dept: "문화예술과" },
  "강북구": { url: "https://www.gangbuk.go.kr", phone: "02-901-6215", dept: "문화관광과" },
  "강서구": { url: "https://www.gangseo.seoul.kr", phone: "02-2600-6435", dept: "체육관광과" },
  "관악구": { url: "https://www.gwanak.go.kr", phone: "02-879-5614", dept: "문화관광체육과" },
  "광진구": { url: "https://www.gwangjin.go.kr", phone: "02-450-7582", dept: "문화예술과" },
  "구로구": { url: "https://www.guro.go.kr", phone: "02-860-3401", dept: "문화관광과" },
  "금천구": { url: "https://www.geumcheon.go.kr", phone: "02-2627-1453", dept: "문화체육과" },
  "노원구": { url: "https://www.nowon.kr", phone: "02-2116-7143", dept: "문화도시과" },
  "도봉구": { url: "https://www.dobong.go.kr", phone: "02-2091-2263", dept: "문화체육과" },
  "동대문구": { url: "https://www.ddm.go.kr", phone: "02-2127-4715", dept: "문화관광과" },
  "동작구": { url: "https://www.dongjak.go.kr", phone: "02-820-2941", dept: "문화정책과" },
  "마포구": { url: "https://www.mapo.go.kr", phone: "02-3153-8664", dept: "관광정책과" },
  "서대문구": { url: "https://www.sdm.go.kr", phone: "02-330-1127", dept: "문화체육과" },
  "서초구": { url: "https://www.seocho.go.kr", phone: "02-2155-6207", dept: "문화체육과" },
  "성동구": { url: "https://www.sd.go.kr", phone: "02-2286-6488", dept: "문화체육과" },
  "성북구": { url: "https://www.sb.go.kr", phone: "02-2241-2635", dept: "문화체육과" },
  "송파구": { url: "https://www.songpa.go.kr", phone: "02-2147-2289", dept: "관광진흥과" },
  "양천구": { url: "https://www.yangcheon.go.kr", phone: "02-2620-3409", dept: "문화체육과" },
  "영등포구": { url: "https://www.ydp.go.kr", phone: "02-2670-3126", dept: "문화체육과" },
  "용산구": { url: "https://www.yongsan.go.kr", phone: "02-2199-7557", dept: "문화체육과" },
  "은평구": { url: "https://www.ep.go.kr", phone: "02-351-6505", dept: "문화관광과" },
  "종로구": { url: "https://www.jongno.go.kr", phone: "02-2148-1863", dept: "관광체육과" },
  "중구": { url: "https://www.junggu.seoul.kr", phone: "02-3396-4634", dept: "체육관광과" },
  "중랑구": { url: "https://www.jungnang.go.kr", phone: "02-2094-1816", dept: "문화관광과" },
}

export default function BuildingCheckSection() {
  const [address, setAddress] = useState("")
  const [district, setDistrict] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<BuildingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openPostcode() {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete(data: { address: string; addressType: string; roadAddress: string; jibunAddress: string; sigungu: string }) {
        const selected = data.addressType === "R" ? data.roadAddress : data.jibunAddress
        setAddress(selected)
        setDistrict(data.sigungu)
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
      const res = await fetch("/api/building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "조회에 실패했습니다.")
        return
      }
      if (json.district) setDistrict(json.district)
      setResult(json)
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const districtInfo = district ? DISTRICT_INFO[district] : null

  return (
    <section className="w-full py-14 sm:py-16 bg-[#F0F5FF]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 섹션 헤더 */}
        <div className="mb-8 flex flex-col gap-2">
          <div
            className="inline-flex items-center gap-2 self-start bg-white border border-[#BDD0F5] text-[#1a56db] font-bold"
            style={{ fontSize: "12px", padding: "5px 14px", borderRadius: "9999px", boxShadow: "0 2px 8px rgba(26,86,219,0.10)" }}
          >
            <Building2 size={12} strokeWidth={2.5} />
            건물 분석
          </div>
          <h2
            className="font-black text-[#0F172A]"
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", lineHeight: "1.2", letterSpacing: "-0.04em" }}
          >
            내 건물,{" "}
            <span className="bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent">
              외도민 등록
            </span>{" "}
            가능할까?
          </h2>
          <p className="text-[#64748B]" style={{ fontSize: "15px", lineHeight: "1.7" }}>
            주소를 입력하면 건축물대장 기준으로 등록 가능성을 추정합니다.
          </p>
        </div>

        {/* 입력 카드 */}
        <div
          className="bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          </div>

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
              "건물 조회 →"
            )}
          </button>

          {error && (
            <p className="mt-3 text-center text-sm text-[#DC2626]">{error}</p>
          )}
        </div>

        {/* 결과 카드 */}
        {result && (
          <div
            className="mt-5 bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            {/* 상단: 아이콘 + 외도민 가능성 뱃지 */}
            <div className="mb-4 flex items-center justify-between">
              <div
                className="flex items-center justify-center rounded-[11px]"
                style={{ width: "38px", height: "38px", background: ICON_BG[result.color] }}
              >
                <Building2 size={18} style={{ color: ICON_COLOR[result.color] }} />
              </div>
              <span
                className={`rounded-full font-bold ${BADGE_STYLES[result.color]}`}
                style={{ fontSize: "11px", padding: "3px 10px" }}
              >
                외도민 {result.label}
              </span>
            </div>

            {/* 건물 기본정보 그리드 */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: "#FAFBFF" }}>
                <p className="mb-1 text-[#94A3B8]" style={{ fontSize: "12px" }}>건물용도</p>
                <p className="font-bold text-[#0F172A]" style={{ fontSize: "14px", lineHeight: "1.4" }}>
                  {result.buildingPurpose}
                </p>
              </div>
              <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: "#FAFBFF" }}>
                <p className="mb-1 text-[#94A3B8]" style={{ fontSize: "12px" }}>층수</p>
                <p className="font-bold text-[#0F172A]" style={{ fontSize: "14px" }}>
                  {result.floors}
                </p>
              </div>
              <div className="rounded-[12px] border border-[#E2EAF8] p-4" style={{ background: "#FAFBFF" }}>
                <p className="mb-1 text-[#94A3B8]" style={{ fontSize: "12px" }}>사용승인일</p>
                <p className="font-bold text-[#0F172A]" style={{ fontSize: "14px" }}>
                  {result.approvalDate}
                </p>
              </div>
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
              이 결과는 건축물대장 기준의 참고 추정치입니다.
              <br />
              실제 외도민 등록 가능 여부는 관할 구청 확인이 필요합니다.
              <br />
              조회 기준일: {result.checkedAt}
            </div>

            {/* 담당부서 문의 블록 */}
            {districtInfo && (
              <div
                className="mb-5 flex flex-col gap-3 rounded-[14px] border border-[#E2EAF8] p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "#FAFBFF" }}
              >
                <div className="flex items-center gap-2 text-[#475569]" style={{ fontSize: "13px" }}>
                  <Phone size={14} className="shrink-0 text-[#94A3B8]" />
                  <span>
                    <span className="font-bold text-[#0F172A]">{district}청</span>{" "}
                    {districtInfo.phone} · {districtInfo.dept}
                  </span>
                </div>
                <a
                  href={districtInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 cursor-pointer rounded-[11px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] font-bold text-[#1a56db]"
                  style={{ fontSize: "13px", padding: "9px 16px", touchAction: "manipulation" }}
                >
                  {district}청 바로가기
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* 이메일 CTA */}
            <EmailCTA />
          </div>
        )}
      </div>
    </section>
  )
}
