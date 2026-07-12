import { Check, X } from "lucide-react"

const ASIS_ITEMS = [
  "주말마다 후보 동네를 발품 팔며 임장",
  "카페 후기와 지인 이야기로 시세 짐작",
  "주변에 경쟁 숙소가 몇 개인지 알 방법이 없음",
  "수익 계산은 엑셀에 대충 넣어보는 주먹구구",
]

const TOBE_ITEMS = [
  "지도에서 10초 만에 동별 경쟁밀도 확인",
  "공공데이터 기반 외도민 등록 숙소 현황",
  "실제 에어비앤비 매물 분포와 동네 수익 통계",
  "예상 매출·순수익·원금회수기간까지 자동 계산",
]

export default function ProblemSection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
            왜 방정식인가
          </span>
          <h2
            className="font-black text-[#0F172A] mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.25", letterSpacing: "-0.03em" }}
          >
            아직도 발품과 감으로
            <br className="sm:hidden" /> 입지를 정하시나요?
          </h2>
          <p className="text-[15px] text-[#64748B]" style={{ lineHeight: "1.8" }}>
            숙박업 창업에서 입지 판단에 쓰던 시간과 불확실성을 데이터로 줄입니다.
          </p>
        </div>

        {/* ASIS vs TOBE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch">
          {/* 기존 방식 */}
          <div
            className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-7"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] text-[12px] font-bold mb-5">
              기존 방식
            </span>
            <ul className="space-y-3.5">
              {ASIS_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                    <X size={11} className="text-[#DC2626]" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-[#64748B]" style={{ lineHeight: "1.7" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 방정식 */}
          <div
            className="relative rounded-[18px] border border-[#BDD0F5] bg-white p-6 sm:p-7"
            style={{ boxShadow: "0 4px 20px rgba(26,86,219,0.12)" }}
          >
            <div
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(26,86,219,0.04), rgba(14,165,233,0.04))",
              }}
            />
            <span
              className="inline-block px-3 py-1 rounded-full text-white text-[12px] font-bold mb-5"
              style={{ background: "linear-gradient(135deg, #1a56db, #0ea5e9)" }}
            >
              f(방)정식
            </span>
            <ul className="space-y-3.5">
              {TOBE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] font-medium text-[#334155]" style={{ lineHeight: "1.7" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
