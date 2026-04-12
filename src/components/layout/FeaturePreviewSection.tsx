import { MapPin, BarChart3, Sparkles, TrendingUp } from "lucide-react"

const features = [
  {
    icon: <TrendingUp size={20} className="text-[#1a56db]" />,
    title: "에어비앤비 실거래 객단가 비교",
    description:
      "내 동네 실제 운영 중인 에어비앤비 숙소들의 평균 객단가와 예약률을 확인하세요.",
    highlight: true,
  },
  {
    icon: <MapPin size={20} className="text-[#1a56db]" />,
    title: "지도 기반 입지 시각화",
    description:
      "마포·홍대·용산·이태원 일대 객단가 핀 지도. hover 시 가격 말풍선, 클릭 시 동네 평균 통계 패널.",
    highlight: false,
  },
  {
    icon: <BarChart3 size={20} className="text-[#1a56db]" />,
    title: "동네 평균 수익 통계",
    description:
      "우리 동네 2룸 평균 객단가와 예약률. 실제 운영 중인 숙소 데이터 기반으로 제공합니다.",
    highlight: false,
  },
  {
    icon: <Sparkles size={20} className="text-[#1a56db]" />,
    title: "인테리어 프리미엄 점수",
    description:
      "소파, 빔프로젝터, 테라스 유무에 따른 객단가 차이. 어떤 인테리어가 수익을 올리는지 데이터로 확인하세요.",
    highlight: false,
  },
]

export default function FeaturePreviewSection() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
            출시 예정
          </span>
          <h2
            className="font-black text-[#0F172A] mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.8rem)", lineHeight: "1.2", letterSpacing: "-0.03em" }}
          >
            곧 이런 기능이 열립니다
          </h2>
          <p className="text-[15px] text-[#64748B]">
            실제 에어비앤비 데이터 기반 분석 도구를 준비하고 있어요.
          </p>
        </div>

        {/* 기능 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`relative bg-white border rounded-[18px] p-6 ${
                f.highlight
                  ? "border-[#BDD0F5] shadow-[0_4px_20px_rgba(26,86,219,0.10)]"
                  : "border-[#E2EAF8]"
              }`}
            >
              {f.highlight && (
                <div
                  className="absolute inset-0 rounded-[18px] pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(26,86,219,0.04), rgba(14,165,233,0.04))",
                  }}
                />
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                    f.highlight
                      ? "bg-gradient-to-r from-[#1a56db] to-[#0ea5e9] text-white"
                      : "bg-[#EEF4FF] text-[#1a56db]"
                  }`}
                >
                  Coming Soon
                </span>
              </div>
              <h3 className="text-[17px] font-bold text-[#0F172A] mb-2">{f.title}</h3>
              <p className="text-[14px] text-[#64748B] leading-[1.7]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
