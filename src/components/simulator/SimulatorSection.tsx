"use client"

import { useRef, useState } from "react"
import ResultCards, { type CalcResult } from "./ResultCards"
import MonthlyLedger from "./MonthlyLedger"

interface FormValues {
  monthlyRent: string
  nightlyRate: string
  occupancyRate: string
  initialInvestment: string
  cleaningCostMonthly: string
  utilityCostPerMonth: string
}

function toRaw(val: string) {
  return val.replace(/[^0-9]/g, "")
}

function toDisplay(raw: string) {
  if (!raw) return ""
  return Number(raw).toLocaleString("ko-KR")
}

export default function SimulatorSection() {
  const [form, setForm] = useState<FormValues>({
    monthlyRent: "",
    nightlyRate: "",
    occupancyRate: "",
    initialInvestment: "",
    cleaningCostMonthly: "",
    utilityCostPerMonth: "",
  })
  const [result, setResult] = useState<CalcResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  function handleChange(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: toRaw(value) }))
  }

  function calculate() {
    const rent = Number(form.monthlyRent)
    const rate = Number(form.nightlyRate)
    const occ = Number(form.occupancyRate)
    const invest = Number(form.initialInvestment)

    if (!rent || !rate || !occ || !invest) return

    const cleaningCost = Number(form.cleaningCostMonthly)
    const electricityCost = Number(form.utilityCostPerMonth)
    const bookingsPerMonth = (occ / 100) * 30
    const monthlyRevenue = rate * (occ / 100) * 30
    const monthlyProfit = monthlyRevenue - rent - cleaningCost - electricityCost
    const roi = invest > 0 ? (monthlyProfit / invest) * 100 : 0
    const paybackMonths =
      monthlyProfit > 0 ? invest / monthlyProfit : Infinity

    setResult({
      monthlyRevenue,
      cleaningCost,
      electricityCost,
      monthlyProfit,
      roi,
      paybackMonths,
      bookingsPerMonth,
    })

    setTimeout(() => {
      if (resultRef.current) {
        const top = resultRef.current.getBoundingClientRect().top + window.scrollY - 80
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }, 100)
  }

  return (
    <section className="py-16 bg-[#F0F5FF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* 섹션 타이틀 */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold bg-[#EEF4FF] text-[#1a56db] border border-[#BDD0F5]">
            수익성 계산기
          </span>
          <h2
            className="mt-4 font-black text-[#0F172A]"
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              lineHeight: "1.2",
              letterSpacing: "-0.03em",
            }}
          >
            내 방의 수익을 미리 계산해보세요
          </h2>
          <p className="mt-2 text-[#64748B] text-[15px]">
            아래 정보를 입력하면 예상 순수익과 원금회수기간을 즉시 확인할 수
            있습니다.
          </p>
        </div>

        {/* 입력 폼 */}
        <div
          className="rounded-[18px] border border-[#E2EAF8] overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #ffffff 0%, #F0F5FF 100%)",
            borderTop: "3px solid #1a56db",
            boxShadow: "0 4px 24px rgba(26,86,219,0.08)",
          }}
        >
          <div className="px-6 sm:px-8 py-4 border-b border-[#E2EAF8]">
            <span
              className="text-[12px] font-bold text-[#1a56db] bg-[#EEF4FF] rounded-[6px]"
              style={{ padding: "4px 10px" }}
            >
              입력 정보
            </span>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
              <InputField
                label="월세"
                placeholder="예: 1,500,000"
                suffix="원 / 월"
                value={toDisplay(form.monthlyRent)}
                onChange={(v) => handleChange("monthlyRent", v)}
              />
              <InputField
                label="예상 객단가 (1박)"
                placeholder="예: 150,000"
                suffix="원 / 박"
                value={toDisplay(form.nightlyRate)}
                onChange={(v) => handleChange("nightlyRate", v)}
              />
              <InputField
                label="예상 예약률"
                placeholder="예: 70"
                suffix="%"
                value={form.occupancyRate}
                onChange={(v) => handleChange("occupancyRate", v)}
              />
              <InputField
                label="초기 투자비용 (인테리어+수리비)"
                placeholder="예: 5,000,000"
                suffix="원"
                value={toDisplay(form.initialInvestment)}
                onChange={(v) => handleChange("initialInvestment", v)}
              />
              <InputField
                label="월 청소비 합계"
                placeholder="예: 300,000"
                suffix="원 / 월"
                value={toDisplay(form.cleaningCostMonthly)}
                onChange={(v) => handleChange("cleaningCostMonthly", v)}
              />
              <InputField
                label="공과금"
                placeholder="예: 150,000"
                suffix="원 / 월"
                value={toDisplay(form.utilityCostPerMonth)}
                onChange={(v) => handleChange("utilityCostPerMonth", v)}
              />
            </div>

            <button
              type="button"
              onClick={calculate}
              className="mt-5 w-full py-[13px] rounded-[11px] text-white font-extrabold text-[15px] cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                boxShadow: "0 8px 24px rgba(26,86,219,0.35)",
                touchAction: "manipulation",
              }}
            >
              수익 계산하기 →
            </button>
          </div>
        </div>

        {/* 결과 영역 */}
        {result && (
          <div ref={resultRef} className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ResultCards result={result} />

            <MonthlyLedger
              monthlyRent={Number(form.monthlyRent)}
              nightlyRate={Number(form.nightlyRate)}
              occupancyRate={Number(form.occupancyRate)}
              initialInvestment={Number(form.initialInvestment)}
              cleaningCostMonthly={Number(form.cleaningCostMonthly)}
              utilityCostPerMonth={Number(form.utilityCostPerMonth)}
            />

            {/* 면책문구 */}
            <div
              className="mt-6 bg-[#F8FAFF] rounded-r-[12px] px-[18px] py-[14px] text-[12px] text-[#64748B] leading-[1.8]"
              style={{ borderLeft: "3px solid #93C5FD" }}
            >
              본 시뮬레이션은 사용자 입력값 기반의 추정치이며, 실제 수익과
              다를 수 있습니다. 세금은 매출의 3.3%로 추정하였으며 실제 운영
              환경에 따라 달라질 수 있습니다. 최종 판단은 전문가에게 확인하시기
              바랍니다.
            </div>

            {/* 하단 CTA */}
            <div className="mt-8 bg-white rounded-[18px] border border-[#E2EAF8] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 sm:p-8 text-center">
              <h3
                className="font-bold text-[#0F172A]"
                style={{ fontSize: "1.1rem", lineHeight: "1.3" }}
              >
                내 동네 실제 에어비앤비 데이터가 궁금하다면?
              </h3>
              <p className="mt-2 text-[14px] text-[#64748B]">
                정확한 동네별 수익 데이터와 입지 리스크를<br />출시 즉시 받아보세요.
              </p>
              <a
                href="#waitlist"
                className="mt-5 inline-flex items-center gap-2 py-[13px] px-[26px] rounded-[11px] text-white font-extrabold text-[15px] hover:opacity-90 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
                  boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
                }}
              >
                더 정확한 데이터 받아보기 →
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

interface InputFieldProps {
  label: string
  placeholder: string
  suffix: string
  value: string
  onChange: (v: string) => void
}

function InputField({
  label,
  placeholder,
  suffix,
  value,
  onChange,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#1a56db]">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[42px] px-4 pr-14 text-[15px] text-[#111827] border-[1.5px] border-[#C7D9F5] rounded-[10px] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1a56db] transition-[border-color] duration-150"
          style={{
            background: "linear-gradient(135deg, #F8FAFF 0%, #ffffff 100%)",
            boxShadow: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#1a56db"
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "#C7D9F5"
            }
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#1a56db"
            e.target.style.boxShadow = "0 0 0 3px rgba(26,86,219,0.1)"
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#C7D9F5"
            e.target.style.boxShadow = "none"
          }}
        />
        <span className="absolute right-4 text-[12px] text-[#1a56db] font-semibold pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  )
}
