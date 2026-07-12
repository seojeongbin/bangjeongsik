import { MapPin, BarChart3, Calculator } from "lucide-react"

const FEATURES = [
  {
    icon: <MapPin size={20} className="text-[#1a56db]" />,
    badge: "무료",
    badgeStyle: "free" as const,
    title: "외도민 경쟁밀도",
    description:
      "마포구 16개 동의 외국인관광도시민박업 등록 현황을 지도에서 무료로 확인하세요. 동별 밀도 등급부터 개별 등록 숙소 위치까지, 공공데이터 인허가 정보 기반입니다.",
  },
  {
    icon: <BarChart3 size={20} className="text-[#1a56db]" />,
    badge: "크레딧",
    badgeStyle: "paid" as const,
    title: "에어비앤비 매물 분석",
    description:
      "실제 영업 중인 에어비앤비 매물 분포를 핀으로 확인하고, 원하는 위치의 반경을 골라 동네 평균 객단가·예약률 통계 리포트를 받아보세요.",
  },
  {
    icon: <Calculator size={20} className="text-[#1a56db]" />,
    badge: "크레딧",
    badgeStyle: "paid" as const,
    title: "수익 시뮬레이션",
    description:
      "보증금·월세·운영비를 넣으면 예상 월매출과 순수익, ROI, 원금회수기간까지 자동 계산됩니다. 12개월 예상 가계부로 창업 전 손익을 미리 확인하세요.",
  },
]

export default function FeatureSection() {
  return (
    <section className="bg-[#F8FAFF] py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
            핵심 기능
          </span>
          <h2
            className="font-black text-[#0F172A] mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.25", letterSpacing: "-0.03em" }}
          >
            입지 판단에 필요한 세 가지,
            <br className="sm:hidden" /> 한 곳에서
          </h2>
          <p className="text-[15px] text-[#64748B]" style={{ lineHeight: "1.8" }}>
            경쟁 현황 파악부터 수익 계산까지 지도 한 화면에서 끝냅니다.
          </p>
        </div>

        {/* 기능 카드 3종 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-[#E2EAF8] rounded-[18px] p-6"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                    f.badgeStyle === "free"
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : "bg-[#EEF4FF] text-[#1a56db]"
                  }`}
                >
                  {f.badge}
                </span>
              </div>
              <h3 className="text-[17px] font-bold text-[#0F172A] mb-2">{f.title}</h3>
              <p className="text-[14px] text-[#64748B]" style={{ lineHeight: "1.7" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* 데이터 기준 안내 */}
        <p className="mt-6 text-center text-[12px] text-[#94A3B8]" style={{ lineHeight: "1.8" }}>
          수익·예약률 수치는 통계 가공된 동네 평균 추정치이며, 모든 리포트에 데이터 기준일이 표시됩니다.
        </p>
      </div>
    </section>
  )
}
