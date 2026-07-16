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
    <section className="bg-[#F7F8FA] py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 헤더 */}
        <div className="mb-10">
          <span className="inline-block rounded-[6px] bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8] mb-4">
            왜 방정식인가
          </span>
          <h2
            className="font-extrabold text-[#0F172A] mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.25", letterSpacing: "-0.03em" }}
          >
            아직도 발품과 감으로 입지를 정하시나요?
          </h2>
          <p className="text-[15px] text-[#475569]" style={{ lineHeight: "1.8" }}>
            숙박업 창업에서 입지 판단에 쓰던 시간과 불확실성을 데이터로 줄입니다.
          </p>
        </div>

        {/* ASIS vs TOBE — 경계선·배경 대비로 구분 (그림자 없음) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* 기존 방식 */}
          <div className="rounded-[12px] border border-[#E4E7EC] bg-white p-6 sm:p-7">
            <span className="inline-block rounded-[6px] bg-[#F1F3F6] px-2.5 py-1 text-[12px] font-bold text-[#475569] mb-5">
              기존 방식
            </span>
            <ul className="space-y-3.5">
              {ASIS_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#F1F3F6] flex items-center justify-center">
                    <X size={11} className="text-[#64748B]" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-[#64748B]" style={{ lineHeight: "1.7" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 방정식 */}
          <div className="rounded-[12px] border-2 border-[#1D4ED8] bg-white p-6 sm:p-7">
            <span className="inline-block rounded-[6px] bg-[#1D4ED8] px-2.5 py-1 text-[12px] font-bold text-white mb-5">
              f(방)정식
            </span>
            <ul className="space-y-3.5">
              {TOBE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#EEF4FF] flex items-center justify-center">
                    <Check size={11} className="text-[#1D4ED8]" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] font-medium text-[#0F172A]" style={{ lineHeight: "1.7" }}>
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
