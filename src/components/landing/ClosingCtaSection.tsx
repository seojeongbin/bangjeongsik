import Link from "next/link"

// v4 — 그라데이션 슬래브 폐기, 짙은 잉크 네이비 단색 블록으로 대비 확보.
export default function ClosingCtaSection() {
  return (
    <section className="bg-white py-14 sm:py-20 border-t border-[#E4E7EC]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-[14px] bg-[#0F172A] px-6 py-12 sm:px-12 sm:py-14">
          <div className="max-w-2xl">
            <h2
              className="font-extrabold text-white mb-3"
              style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", lineHeight: "1.3", letterSpacing: "-0.03em" }}
            >
              지금 바로 무료로 시작하세요
            </h2>
            <p className="text-[15px] text-[#CBD5E1] mb-8" style={{ lineHeight: "1.8" }}>
              회원가입만 하면 무료 분석 크레딧 1회가 지급됩니다.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-[10px] bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.98] px-8 py-[14px] text-[15px] font-extrabold text-white transition-all"
              >
                무료로 분석하기 →
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/30 hover:bg-white/10 px-6 py-[13px] text-[15px] font-bold text-white transition-colors"
              >
                요금제 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
