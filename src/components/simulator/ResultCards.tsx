import { TrendingUp, Wallet, BarChart3, Clock } from "lucide-react"

export interface CalcResult {
  monthlyRevenue: number
  cleaningCost: number
  electricityCost: number
  monthlyProfit: number
  roi: number
  paybackMonths: number
  bookingsPerMonth: number
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR")
}

function roiChip(roi: number): { label: string; className: string } {
  if (roi >= 5) return { label: "우수", className: "bg-[#DCFCE7] text-[#15803D]" }
  if (roi >= 2) return { label: "보통", className: "bg-[#FEF3C7] text-[#B45309]" }
  return { label: "주의", className: "bg-[#FEE2E2] text-[#B91C1C]" }
}

export default function ResultCards({ result }: { result: CalcResult }) {
  const { monthlyRevenue, monthlyProfit, roi, paybackMonths } = result

  const isProfit = monthlyProfit >= 0
  const profitChip = isProfit
    ? { label: "흑자", className: "bg-[#DCFCE7] text-[#15803D]" }
    : { label: "적자", className: "bg-[#FEE2E2] text-[#B91C1C]" }
  const profitColor = isProfit ? "text-[#16A34A]" : "text-[#DC2626]"
  const roiInfo = roiChip(roi)

  const paybackText =
    paybackMonths === Infinity || paybackMonths <= 0
      ? "회수 불가"
      : paybackMonths >= 12
        ? `${(paybackMonths / 12).toFixed(1)}년`
        : `${Math.ceil(paybackMonths)}개월`

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card
        icon={<TrendingUp size={18} className="text-[#1a56db]" />}
        iconBg="bg-[#EEF4FF]"
        chip={{ label: "예상 매출", className: "bg-[#DBEAFE] text-[#1D4ED8]" }}
        label="월 예상 매출"
        value={`${fmt(monthlyRevenue)}원`}
        valueClass="text-[#1a56db]"
        sub="객단가 × 예약률 × 30일"
      />
      <Card
        icon={
          <Wallet
            size={18}
            className={isProfit ? "text-[#16A34A]" : "text-[#DC2626]"}
          />
        }
        iconBg={isProfit ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}
        chip={profitChip}
        label="월 예상 순수익"
        value={`${monthlyProfit >= 0 ? "" : "-"}${fmt(Math.abs(monthlyProfit))}원`}
        valueClass={profitColor}
        sub="매출 - 월세 - 청소비 - 전기세"
      />
      <Card
        icon={<BarChart3 size={18} className="text-[#1a56db]" />}
        iconBg="bg-[#EEF4FF]"
        chip={roiInfo}
        label="월 ROI"
        value={`${roi.toFixed(1)}%`}
        valueClass="text-[#1a56db]"
        sub="순수익 ÷ 초기투자비용"
      />
      <Card
        icon={<Clock size={18} className="text-[#D97706]" />}
        iconBg="bg-[#FEF3C7]"
        chip={{ label: "회수기간", className: "bg-[#FEF3C7] text-[#B45309]" }}
        label="원금 회수기간"
        value={paybackText}
        valueClass="text-[#D97706]"
        sub="초기투자비용 ÷ 월순수익"
      />
    </div>
  )
}

interface CardProps {
  icon: React.ReactNode
  iconBg: string
  chip: { label: string; className: string }
  label: string
  value: string
  valueClass: string
  sub: string
}

function Card({ icon, iconBg, chip, label, value, valueClass, sub }: CardProps) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2EAF8] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        <span
          className={`px-[10px] py-[3px] rounded-[6px] text-[11px] font-bold ${chip.className}`}
        >
          {chip.label}
        </span>
      </div>
      <p className="text-[12px] text-[#94A3B8] font-semibold mb-1">{label}</p>
      <p
        className={`text-[1.85rem] font-black leading-[1.1] tracking-[-0.04em] ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] text-[#94A3B8]">{sub}</p>
    </div>
  )
}
