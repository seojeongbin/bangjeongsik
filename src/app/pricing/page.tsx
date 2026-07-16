import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"
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
      <main className="flex-1 bg-[#F7F8FA] pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* 헤더 */}
          <div className="pt-12 sm:pt-16 mb-10">
            <span className="inline-block rounded-[6px] bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8] mb-4">
              요금제
            </span>
            <h1
              className="font-extrabold text-[#0F172A] mb-3"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", lineHeight: "1.25", letterSpacing: "-0.04em" }}
            >
              필요한 만큼만, 크레딧으로
            </h1>
            <p className="text-[15px] text-[#475569]" style={{ lineHeight: "1.8" }}>
              {CREDIT_PAYMENT.usage}
            </p>
          </div>

          {/* 플랜 카드 4종 — 경계선 구분, 추천만 브랜드 강조 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch mb-10">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[12px] bg-white p-6 ${
                  plan.highlight ? "border-2 border-[#1D4ED8]" : "border border-[#E4E7EC]"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-5 inline-flex items-center whitespace-nowrap rounded-[6px] bg-[#1D4ED8] px-2.5 py-1 text-[11px] font-bold text-white">
                    {plan.badge}
                  </span>
                )}

                <p className="font-extrabold text-[#0F172A] mb-1" style={{ fontSize: "16px" }}>
                  {plan.name}
                </p>
                <p className="text-[12px] text-[#64748B] mb-4">{plan.desc}</p>

                {/* 가격/단가를 세로로 쌓아 4카드 모두 동일한 폭에서 줄바꿈 없이 렌더 */}
                <div className="flex flex-col gap-0.5 mb-5">
                  <span
                    className={`font-black text-[1.55rem] lg:text-[1.35rem] tabular-nums ${
                      plan.highlight ? "text-[#1D4ED8]" : "text-[#0F172A]"
                    }`}
                    style={{ letterSpacing: "-0.04em", lineHeight: 1.2 }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] tabular-nums">{plan.priceNote}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-[#1D4ED8]" strokeWidth={3} />
                      <span className="text-[13px] text-[#475569]" style={{ lineHeight: "1.6" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`inline-flex items-center justify-center w-full py-[13px] rounded-[10px] font-extrabold text-[14px] transition-all active:scale-[0.98] ${
                    plan.highlight
                      ? "text-white bg-[#1D4ED8] hover:bg-[#1E40AF]"
                      : "text-[#1D4ED8] bg-[#EEF4FF] border border-[#BDD0F5] hover:bg-[#E2ECFF]"
                  }`}
                >
                  {plan.cta.label} →
                </Link>
              </div>
            ))}
          </div>

          {/* 크레딧으로 열리는 것 */}
          <div className="rounded-[12px] border border-[#E4E7EC] bg-white p-6 sm:p-7 mb-6">
            <p className="text-[12px] font-bold text-[#0F172A] mb-4">크레딧 1회 분석에 포함되는 것</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {UNLOCK_ITEMS.map((label) => (
                <li key={label} className="flex items-center gap-2.5">
                  <Check size={14} className="flex-shrink-0 text-[#1D4ED8]" strokeWidth={3} />
                  <span className="text-[13px] text-[#475569]">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 결제·환불 안내 */}
          <div
            className="rounded-r-[10px] px-5 py-4 text-[12px] text-[#64748B]"
            style={{ borderLeft: "3px solid #93C5FD", background: "#F1F3F6", lineHeight: "1.8" }}
          >
            <p>
              모든 가격은 {CREDIT_PAYMENT.priceNote} 기준입니다. {CREDIT_PAYMENT.refundPolicy}
            </p>
            <p className="mt-1">월간 구독: {CREDIT_PAYMENT.subscriptionPolicy}</p>
            {CREDIT_PAYMENT.contactEmail && (
              <p className="mt-1">
                문의:{" "}
                <a href={`mailto:${CREDIT_PAYMENT.contactEmail}`} className="underline">
                  {CREDIT_PAYMENT.contactEmail}
                </a>
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
