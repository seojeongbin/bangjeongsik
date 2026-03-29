"use client"

import { useState } from "react"
import ResultCards, { type CalcResult } from "./ResultCards"
import MonthlyLedger from "./MonthlyLedger"

interface FormValues {
  monthlyRent: string
  nightlyRate: string
  occupancyRate: string
  initialInvestment: string
  cleaningCostPerBooking: string
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
    monthlyRent: "1500000",
    nightlyRate: "150000",
    occupancyRate: "70",
    initialInvestment: "5000000",
    cleaningCostPerBooking: "30000",
    utilityCostPerMonth: "150000",
  })
  const [result, setResult] = useState<CalcResult | null>(null)

  function handleChange(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: toRaw(value) }))
  }

  function calculate() {
    const rent = Number(form.monthlyRent)
    const rate = Number(form.nightlyRate)
    const occ = Number(form.occupancyRate)
    const invest = Number(form.initialInvestment)

    if (!rent || !rate || !occ || !invest) return

    const cleaningPerBooking = Number(form.cleaningCostPerBooking)
    const utilityPerMonth = Number(form.utilityCostPerMonth)
    const bookingsPerMonth = (occ / 100) * 30
    const monthlyRevenue = rate * (occ / 100) * 30
    const cleaningCost = bookingsPerMonth * cleaningPerBooking
    const electricityCost = utilityPerMonth
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
        <div className="bg-white rounded-[18px] border border-[#E2EAF8] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 sm:p-8">
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-5">
            <InputField
              label="월세"
              placeholder="예: 1,200,000"
              suffix="원 / 월"
              value={toDisplay(form.monthlyRent)}
              onChange={(v) => handleChange("monthlyRent", v)}
            />
            <InputField
              label="예상 객단가 (1박)"
              placeholder="예: 80,000"
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
              placeholder="예: 10,000,000"
              suffix="원"
              value={toDisplay(form.initialInvestment)}
              onChange={(v) => handleChange("initialInvestment", v)}
            />
            <InputField
              label="청소비"
              placeholder="예: 30,000"
              suffix="원 / 건"
              value={toDisplay(form.cleaningCostPerBooking)}
              onChange={(v) => handleChange("cleaningCostPerBooking", v)}
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
            onClick={calculate}
            className="mt-6 w-full py-[13px] rounded-[11px] text-white font-extrabold text-[15px] cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
              boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
            }}
          >
            수익 계산하기 →
          </button>
        </div>

        {/* 결과 영역 */}
        {result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ResultCards result={result} />

            <MonthlyLedger
              monthlyRent={Number(form.monthlyRent)}
              nightlyRate={Number(form.nightlyRate)}
              occupancyRate={Number(form.occupancyRate)}
              initialInvestment={Number(form.initialInvestment)}
              cleaningCostPerBooking={Number(form.cleaningCostPerBooking)}
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
                정확한 동네별 수익 데이터와 입지 리스크를 출시 즉시 받아보세요.
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
      <label className="text-[13px] font-semibold text-[#0F172A]">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[50px] px-4 pr-14 text-[15px] text-[#0F172A] bg-white border-[1.5px] border-[#CBD5E1] rounded-[11px] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1a56db] transition-all"
          style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}
          onFocus={(e) => {
            e.target.style.boxShadow =
              "0 2px 6px rgba(0,0,0,0.04), 0 0 0 3px #EEF4FF"
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)"
          }}
        />
        <span className="absolute right-4 text-[13px] text-[#94A3B8] font-medium pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  )
}
