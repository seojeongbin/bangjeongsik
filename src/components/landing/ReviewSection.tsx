import { MessageSquare } from "lucide-react"

/**
 * 후기 섹션 — 아직 실제 후기가 없어 플레이스홀더 구조만 렌더링.
 * 가짜 후기 텍스트를 채우지 말 것 (허위 후기는 표시광고법 위반 소지).
 * 실제 후기가 모이면 이 카드 자리에 후기 데이터를 연결한다.
 */
const PLACEHOLDER_COUNT = 6

export default function ReviewSection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF4FF] text-[#1a56db] text-[11px] font-bold mb-4">
            이용 후기
          </span>
          <h2
            className="font-black text-[#0F172A] mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.25", letterSpacing: "-0.03em" }}
          >
            사용자 후기를 모으고 있어요
          </h2>
          <p className="text-[15px] text-[#64748B]" style={{ lineHeight: "1.8" }}>
            서비스 오픈 초기라 아직 후기가 없습니다.
            <br className="sm:hidden" /> 실제 사용자 후기가 준비되는 대로 이곳에 게시됩니다.
          </p>
        </div>

        {/* 3×2 플레이스홀더 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
            <div
              key={i}
              className="rounded-[18px] bg-[#F8FAFF] p-6 flex flex-col items-center justify-center gap-3 min-h-[150px]"
              style={{ border: "1.5px dashed #CBD5E1" }}
            >
              <div className="w-9 h-9 rounded-full bg-[#EEF4FF] flex items-center justify-center">
                <MessageSquare size={16} className="text-[#94A3B8]" />
              </div>
              <span className="text-[13px] font-semibold text-[#94A3B8]">후기 준비 중</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
