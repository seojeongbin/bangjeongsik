import type { Metadata } from "next"
import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import { CREDIT_PLANS, CREDIT_PAYMENT, SUBSCRIPTION_PLAN } from "@/constants/messages"

export const metadata: Metadata = {
  title: "요금제 — f(방)정식",
  description: "무료 크레딧으로 시작하고, 필요한 만큼 분석 크레딧을 충전하세요.",
}

interface PlanCard {
  name: string
  price: string
  priceNote: string
  desc: string
  features: string[]
  cta: { label: string; href: string }
  highlight: boolean
  badge?: string
}

const PLANS: PlanCard[] = [
  {
    name: "Free",
    price: "0원",
    priceNote: "계정당 1회",
    desc: "가입만 하면 무료 분석 1회",
    features: [
      "회원가입 시 분석 크레딧 1회 자동 지급",
      "지도 탐색·동별 경쟁밀도 무료",
      "외도민 등록 숙소 핀 무제한 열람",
    ],
    cta: { label: "무료로 시작하기", href: "/explore" },
    highlight: false,
  },
  {
    name: CREDIT_PLANS.basic.name,
    price: CREDIT_PLANS.basic.price,
    priceNote: CREDIT_PLANS.basic.unitNote,
    desc: CREDIT_PLANS.basic.desc,
    features: [
      `정밀 분석 ${CREDIT_PLANS.basic.credits}회`,
      "원하는 위치·반경 선택 분석",
      "생성한 리포트 재열람 무제한 (차감 없음)",
    ],
    cta: { label: "Basic 시작하기", href: "/checkout?plan=basic" },
    highlight: false,
  },
  {
    name: CREDIT_PLANS.pro.name,
    price: CREDIT_PLANS.pro.price,
    priceNote: CREDIT_PLANS.pro.unitNote,
    desc: CREDIT_PLANS.pro.desc,
    features: [
      `정밀 분석 ${CREDIT_PLANS.pro.credits}회 (9회 가격에 1회 추가)`,
      "원하는 위치·반경 선택 분석",
      "생성한 리포트 재열람 무제한 (차감 없음)",
    ],
    cta: { label: "Pro 시작하기", href: "/checkout?plan=pro" },
    highlight: true,
    badge: "추천",
  },
  {
    name: SUBSCRIPTION_PLAN.name,
    price: SUBSCRIPTION_PLAN.price,
    priceNote: SUBSCRIPTION_PLAN.unitNote,
    desc: SUBSCRIPTION_PLAN.desc,
    features: [
      `매달 정밀 분석 ${SUBSCRIPTION_PLAN.credits}회 자동 충전 (3회 + 무료 1회)`,
      SUBSCRIPTION_PLAN.bonusNote,
      "언제든 해지 가능 · 지급된 크레딧은 해지 후에도 유지",
    ],
    cta: { label: "월간 구독 시작하기", href: "/checkout?plan=sub_basic" },
    highlight: false,
    badge: "매달 +1회 무료",
  },
]

const UNLOCK_ITEMS = [
  "경쟁밀도 — 반경 내 외도민 수 + 강도 분석",
  "건축물대장 — 외도민 등록 가능성 추정",
  "AirROI 수익 데이터 — 동네 평균 ADR·예약률·월수익",
  "수익 시뮬레이터 — 순수익·ROI·원금회수기간",
  "창업 가계부 — 12개월 예상 손익표",
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#F0F5FF] pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* 헤더 */}
          <div className="text-center pt-12 sm:pt-16 mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
              요금제
            </span>
            <h1
              className="font-black text-[#0F172A] mb-3"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", lineHeight: "1.25", letterSpacing: "-0.04em" }}
            >
              필요한 만큼만, 크레딧으로
            </h1>
            <p className="text-[15px] text-[#64748B]" style={{ lineHeight: "1.8" }}>
              {CREDIT_PAYMENT.usage}
            </p>
          </div>

          {/* 플랜 카드 3종 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch mb-10">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[18px] bg-white p-6 sm:p-7 ${
                  plan.highlight ? "border-2 border-[#1a56db]" : "border border-[#E2EAF8]"
                }`}
                style={{
                  boxShadow: plan.highlight
                    ? "0 8px 28px rgba(26,86,219,0.18)"
                    : "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                {plan.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1a56db, #0ea5e9)" }}
                  >
                    <Sparkles size={10} />
                    {plan.badge}
                  </span>
                )}

                <p className="font-extrabold text-[#0F172A] mb-1" style={{ fontSize: "16px" }}>
                  {plan.name}
                </p>
                <p className="text-[12px] text-[#64748B] mb-4">{plan.desc}</p>

                <div className="flex items-baseline gap-1.5 mb-5">
                  <span
                    className="font-black text-[#0F172A]"
                    style={{ fontSize: "1.75rem", letterSpacing: "-0.04em" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">{plan.priceNote}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                        <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
                      </span>
                      <span className="text-[13px] text-[#334155]" style={{ lineHeight: "1.6" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`inline-flex items-center justify-center w-full py-[13px] rounded-[11px] font-extrabold text-[14px] transition-all active:scale-[0.98] ${
                    plan.highlight
                      ? "text-white hover:opacity-90"
                      : "text-[#1a56db] bg-[#EEF4FF] border-[1.5px] border-[#BDD0F5] hover:bg-[#E2ECFF]"
                  }`}
                  style={
                    plan.highlight
                      ? {
                          background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                          boxShadow: "0 6px 20px rgba(26,86,219,0.35)",
                        }
                      : undefined
                  }
                >
                  {plan.cta.label} →
                </Link>
              </div>
            ))}
          </div>

          {/* 크레딧으로 열리는 것 */}
          <div
            className="rounded-[18px] border border-[#E2EAF8] bg-white p-6 sm:p-7 mb-6"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <p className="text-[12px] font-semibold text-[#94A3B8] mb-4 uppercase tracking-wide">
              크레딧 1회 분석에 포함되는 것
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {UNLOCK_ITEMS.map((label) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
                  </span>
                  <span className="text-[13px] text-[#334155]">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 결제·환불 안내 */}
          <div
            className="rounded-r-[12px] px-5 py-4 text-[12px] text-[#64748B]"
            style={{ borderLeft: "3px solid #93C5FD", background: "#F8FAFF", lineHeight: "1.8" }}
          >
            <p>
              모든 가격은 {CREDIT_PAYMENT.priceNote} 기준입니다. {CREDIT_PAYMENT.refundPolicy}
            </p>
            <p className="mt-1">월간 구독: {CREDIT_PAYMENT.subscriptionPolicy}</p>
            <p className="mt-1">
              문의:{" "}
              <a href={`mailto:${CREDIT_PAYMENT.contactEmail}`} className="underline">
                {CREDIT_PAYMENT.contactEmail}
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
