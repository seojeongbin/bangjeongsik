'use client'

import { useState } from 'react'
import ResultCards, { type CalcResult } from '@/components/simulator/ResultCards'
import MonthlyLedger from '@/components/simulator/MonthlyLedger'

interface Props {
  initialNightlyRate?: number
  initialOccupancyRate?: number
}

type OperationType = 'special' | 'full'

function toRaw(val: string) {
  return val.replace(/[^0-9]/g, '')
}

function toDisplay(raw: string) {
  if (!raw) return ''
  return Number(raw).toLocaleString('ko-KR')
}

function InputField({
  label,
  placeholder,
  suffix,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  suffix: string
  value: string
  onChange: (v: string) => void
}) {
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
          style={{ background: 'linear-gradient(135deg, #F8FAFF 0%, #ffffff 100%)' }}
        />
        <span className="absolute right-4 text-[12px] text-[#1a56db] font-semibold pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  )
}

export default function ReportSimulator({ initialNightlyRate, initialOccupancyRate }: Props) {
  const [operationType, setOperationType] = useState<OperationType>('full')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [nightlyRate, setNightlyRate] = useState(
    initialNightlyRate ? String(Math.round(initialNightlyRate)) : '',
  )
  const [occupancyRate, setOccupancyRate] = useState(
    initialOccupancyRate ? String(Math.round(initialOccupancyRate)) : '',
  )
  const [initialInvestment, setInitialInvestment] = useState('')
  const [cleaningCostMonthly, setCleaningCostMonthly] = useState('')
  const [utilityCostPerMonth, setUtilityCostPerMonth] = useState('')
  const [result, setResult] = useState<CalcResult | null>(null)

  const operationDays = operationType === 'special' ? 15 : 365 / 12

  function calculate() {
    const rent = Number(toRaw(monthlyRent))
    const rate = Number(toRaw(nightlyRate))
    const occ = Number(occupancyRate)
    const invest = Number(toRaw(initialInvestment))
    if (!rent || !rate || !occ || !invest) return

    const cleaningCost = Number(toRaw(cleaningCostMonthly))
    const electricityCost = Number(toRaw(utilityCostPerMonth))
    const monthlyRevenue = rate * (occ / 100) * operationDays
    const monthlyProfit = monthlyRevenue - rent - cleaningCost - electricityCost
    const roi = invest > 0 ? (monthlyProfit / invest) * 100 : 0
    const paybackMonths = monthlyProfit > 0 ? invest / monthlyProfit : Infinity
    setResult({
      monthlyRevenue,
      cleaningCost,
      electricityCost,
      monthlyProfit,
      roi,
      paybackMonths,
      bookingsPerMonth: (occ / 100) * operationDays,
    })
  }

  return (
    <div className="space-y-6">
      {/* 운영 유형 */}
      <div className="flex flex-col sm:flex-row gap-2">
        {(
          [
            { value: 'full' as OperationType, label: '1군 외도민', desc: '연 365일 운영 가능' },
            { value: 'special' as OperationType, label: '특례 사업자', desc: '연 180일 상한' },
          ] as const
        ).map((opt) => {
          const selected = operationType === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setOperationType(opt.value); setResult(null) }}
              className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-[10px] border-[1.5px] text-left transition-colors duration-150 ${
                selected ? 'border-[#1a56db] bg-[#EEF4FF]' : 'border-[#C7D9F5] bg-white hover:border-[#1a56db]'
              }`}
            >
              <span
                className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[#1a56db]' : 'border-[#C7D9F5]'}`}
              >
                {selected && <span className="w-2 h-2 rounded-full bg-[#1a56db] block" />}
              </span>
              <span className="flex flex-col">
                <span className={`text-[13px] font-bold ${selected ? 'text-[#1a56db]' : 'text-[#0F172A]'}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-[#64748B]">{opt.desc}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* 입력 필드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField
          label="월세"
          placeholder="예: 1,500,000"
          suffix="원 / 월"
          value={toDisplay(toRaw(monthlyRent))}
          onChange={(v) => { setMonthlyRent(toRaw(v)); setResult(null) }}
        />
        <InputField
          label="예상 객단가 (1박)"
          placeholder="예: 150,000"
          suffix="원 / 박"
          value={toDisplay(toRaw(nightlyRate))}
          onChange={(v) => { setNightlyRate(toRaw(v)); setResult(null) }}
        />
        <InputField
          label="예상 예약률"
          placeholder="예: 70"
          suffix="%"
          value={occupancyRate}
          onChange={(v) => { setOccupancyRate(v.replace(/[^0-9]/g, '')); setResult(null) }}
        />
        <InputField
          label="초기 투자비용"
          placeholder="예: 5,000,000"
          suffix="원"
          value={toDisplay(toRaw(initialInvestment))}
          onChange={(v) => { setInitialInvestment(toRaw(v)); setResult(null) }}
        />
        <InputField
          label="월 청소비 합계"
          placeholder="예: 300,000"
          suffix="원 / 월"
          value={toDisplay(toRaw(cleaningCostMonthly))}
          onChange={(v) => { setCleaningCostMonthly(toRaw(v)); setResult(null) }}
        />
        <InputField
          label="공과금"
          placeholder="예: 150,000"
          suffix="원 / 월"
          value={toDisplay(toRaw(utilityCostPerMonth))}
          onChange={(v) => { setUtilityCostPerMonth(toRaw(v)); setResult(null) }}
        />
      </div>

      <button
        type="button"
        onClick={calculate}
        className="w-full py-[13px] rounded-[11px] text-white font-extrabold text-[15px] hover:opacity-90 transition-opacity"
        style={{
          background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
          boxShadow: '0 8px 24px rgba(26,86,219,0.35)',
        }}
      >
        수익 계산하기 →
      </button>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ResultCards result={result} operationType={operationType} operationDays={operationDays} />
          <MonthlyLedger
            monthlyRent={Number(toRaw(monthlyRent))}
            nightlyRate={Number(toRaw(nightlyRate))}
            occupancyRate={Number(occupancyRate)}
            initialInvestment={Number(toRaw(initialInvestment))}
            cleaningCostMonthly={Number(toRaw(cleaningCostMonthly))}
            utilityCostPerMonth={Number(toRaw(utilityCostPerMonth))}
            operationDays={operationDays}
          />
        </div>
      )}
    </div>
  )
}
