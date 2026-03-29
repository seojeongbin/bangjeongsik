import { MapPin, BarChart3, Sparkles } from "lucide-react"

const features = [
  {
    icon: <MapPin size={20} className="text-[#1a56db]" />,
    title: "동네 입지 분석",
    description:
      "반경 500m 내 경쟁 숙소 수와 평균 예약률을 데이터로 확인. 들어갈지 말지 숫자로 판단하세요.",
  },
  {
    icon: <BarChart3 size={20} className="text-[#1a56db]" />,
    title: "동네 평균 수익 통계",
    description:
      "우리 동네 2룸 평균 객단가와 예약률. 실제 운영 중인 숙소 데이터 기반으로 제공합니다.",
  },
  {
    icon: <Sparkles size={20} className="text-[#1a56db]" />,
    title: "인테리어 프리미엄 점수",
    description:
      "소파, 빔프로젝터, 테라스 유무에 따른 객단가 차이. 어떤 인테리어가 수익을 올리는지 데이터로 확인하세요.",
  },
]

export default function ComingSoonSection() {
  return (
    <section className="bg-[#F8FAFF] py-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
            준비 중
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-[-0.03em] mb-3">
            더 강력한 기능이 곧 찾아옵니다
          </h2>
          <p className="text-[15px] text-[#64748B]">
            실제 에어비앤비 데이터 기반 분석 도구를 준비하고 있어요.
          </p>
        </div>

        {/* 기능 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-[#E2EAF8] rounded-[18px] p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span className="px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold">
                  출시 예정
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A] mb-2">
                {f.title}
              </h3>
              <p className="text-[14px] text-[#64748B] leading-[1.7]">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="#waitlist"
            className="inline-block bg-gradient-to-r from-[#1a56db] to-[#0ea5e9] text-white font-extrabold text-[15px] px-7 py-[13px] rounded-[11px] shadow-[0_6px_20px_rgba(26,86,219,0.38)]"
          >
            출시 알림 신청하기 →
          </a>
        </div>
      </div>
    </section>
  )
}
