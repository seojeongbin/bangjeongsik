import Link from "next/link"

export default function LandingHero() {
  return (
    <section
      className="w-full py-16 sm:py-24"
      style={{
        background: "linear-gradient(155deg, #E8F0FF 0%, #F5F9FF 45%, #E8F5FF 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6">
        {/* 히어로 배지 */}
        <div
          className="inline-flex items-center gap-2 bg-white border border-[#BDD0F5] text-[#1a56db] font-bold"
          style={{
            fontSize: "12px",
            padding: "6px 16px",
            borderRadius: "9999px",
            boxShadow: "0 2px 8px rgba(26,86,219,0.10)",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: "7px",
              height: "7px",
              background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
              flexShrink: 0,
            }}
          />
          에어비앤비 창업 입지 분석 서비스 · 서울 마포구 오픈
        </div>

        {/* 슬로건 */}
        <div className="flex flex-col gap-4">
          <h1
            className="font-black text-[#0F172A]"
            style={{
              fontSize: "clamp(1.9rem, 5vw, 3.25rem)",
              lineHeight: "1.25",
              letterSpacing: "-0.04em",
            }}
          >
            숙소 입지부터 수익까지,
            <br />
            <span className="bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] bg-clip-text text-transparent">
              당신 방의 수익을 위한 단 하나의 공식
            </span>
          </h1>
          <p
            className="mx-auto max-w-xl text-[#64748B]"
            style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", lineHeight: "1.8" }}
          >
            지도에서 경쟁 숙소 밀도를 무료로 확인하고,
            <br className="hidden sm:block" />
            원하는 위치의 수익 분석 리포트까지 10초 만에 받아보세요.
          </p>
        </div>

        {/* 중앙 CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center text-white font-extrabold hover:opacity-90 active:scale-[0.98] transition-all"
            style={{
              background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
              fontSize: "16px",
              padding: "15px 34px",
              borderRadius: "11px",
              boxShadow: "0 6px 20px rgba(26,86,219,0.38)",
            }}
          >
            무료로 분석하기 →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center font-bold text-[#1a56db] bg-[#EEF4FF] hover:bg-[#E2ECFF] transition-colors"
            style={{
              border: "1.5px solid #BDD0F5",
              fontSize: "15px",
              padding: "13px 26px",
              borderRadius: "11px",
            }}
          >
            요금제 보기
          </Link>
        </div>

        <p className="text-[#94A3B8] font-medium" style={{ fontSize: "13px" }}>
          회원가입만 하면 <span className="text-[#1a56db] font-bold">무료 분석 크레딧 1회</span>가
          자동 지급됩니다.
        </p>
      </div>
    </section>
  )
}
