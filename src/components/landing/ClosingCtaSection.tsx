import Link from "next/link"

export default function ClosingCtaSection() {
  return (
    <section className="bg-[#F0F5FF] py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div
          className="rounded-[22px] px-6 py-12 sm:px-12 sm:py-14 text-center"
          style={{
            background: "linear-gradient(135deg, #1a56db, #0ea5e9)",
            boxShadow: "0 12px 40px rgba(26,86,219,0.30)",
          }}
        >
          <h2
            className="font-black text-white mb-3"
            style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.3", letterSpacing: "-0.03em" }}
          >
            지금 바로 무료로 시작하세요
          </h2>
          <p className="text-[15px] text-white/85 mb-8" style={{ lineHeight: "1.8" }}>
            회원가입만 하면 무료 분석 크레딧 1회가 지급됩니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center font-extrabold text-[#1a56db] bg-white hover:bg-[#F0F5FF] active:scale-[0.98] transition-all"
              style={{
                fontSize: "15px",
                padding: "14px 30px",
                borderRadius: "11px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              }}
            >
              무료로 분석하기 →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center font-bold text-white hover:bg-white/10 transition-colors"
              style={{
                border: "1.5px solid rgba(255,255,255,0.55)",
                fontSize: "15px",
                padding: "13px 26px",
                borderRadius: "11px",
              }}
            >
              요금제 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
