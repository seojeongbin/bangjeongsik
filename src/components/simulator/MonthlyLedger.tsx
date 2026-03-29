interface Props {
  monthlyRent: number
  nightlyRate: number
  occupancyRate: number
  initialInvestment: number
  cleaningCostMonthly: number
  utilityCostPerMonth: number
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR")
}

export default function MonthlyLedger({
  monthlyRent,
  nightlyRate,
  occupancyRate,
  initialInvestment,
  cleaningCostMonthly,
  utilityCostPerMonth,
}: Props) {
  const monthlyRevenue = nightlyRate * (occupancyRate / 100) * 30
  const cleaningCost = cleaningCostMonthly
  const electricityCost = utilityCostPerMonth
  const tax = Math.round(monthlyRevenue * 0.033)
  const netIncome = Math.round(
    monthlyRevenue - monthlyRent - cleaningCost - electricityCost - tax
  )

  let cumulativeCashflow = -initialInvestment
  let paybackMonth: number | null = null

  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    cumulativeCashflow += netIncome
    if (cumulativeCashflow >= 0 && paybackMonth === null) {
      paybackMonth = month
    }
    return {
      month,
      netIncome,
      cumulative: cumulativeCashflow,
      isPayback: paybackMonth === month,
    }
  })

  return (
    <div className="mt-6">
      <h3 className="text-[1rem] font-bold text-[#0F172A] mb-3">
        창업 가계부 미리보기 (12개월)
      </h3>
      <div className="bg-white rounded-[18px] border border-[#E2EAF8] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* 월별 비용 요약 */}
        <div className="px-5 py-3 bg-[#F8FAFF] border-b border-[#E2EAF8] flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#64748B]">
          <span>
            월 매출{" "}
            <strong className="text-[#0F172A]">{fmt(monthlyRevenue)}원</strong>
          </span>
          <span>
            월세{" "}
            <strong className="text-[#0F172A]">{fmt(monthlyRent)}원</strong>
          </span>
          <span>
            월 청소비{" "}
            <strong className="text-[#0F172A]">{fmt(cleaningCost)}원</strong>
          </span>
          <span>
            전기세{" "}
            <strong className="text-[#0F172A]">{fmt(electricityCost)}원</strong>
          </span>
          <span>
            세금(3.3% 추정){" "}
            <strong className="text-[#0F172A]">{fmt(tax)}원</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2EAF8] text-[#94A3B8] font-semibold">
                <th className="text-left px-5 py-3">월차</th>
                <th className="text-right px-4 py-3">실수령액</th>
                <th className="text-right px-5 py-3">누적 손익</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.month}
                  className={`border-b border-[#E2EAF8] last:border-0 transition-colors ${
                    row.isPayback ? "bg-[#DCFCE7]" : "hover:bg-[#F8FAFF]"
                  }`}
                >
                  <td className="px-5 py-3 font-semibold text-[#0F172A]">
                    {row.month}개월차
                    {row.isPayback && (
                      <span className="ml-2 px-[8px] py-[2px] bg-[#16A34A] text-white text-[10px] font-bold rounded-[6px]">
                        원금회수
                      </span>
                    )}
                  </td>
                  <td
                    className={`text-right px-4 py-3 font-bold tabular-nums ${
                      row.netIncome >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                    }`}
                  >
                    {row.netIncome >= 0 ? "+" : ""}
                    {fmt(row.netIncome)}원
                  </td>
                  <td
                    className={`text-right px-5 py-3 font-bold tabular-nums ${
                      row.cumulative >= 0 ? "text-[#16A34A]" : "text-[#64748B]"
                    }`}
                  >
                    {row.cumulative >= 0 ? "+" : ""}
                    {fmt(row.cumulative)}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
