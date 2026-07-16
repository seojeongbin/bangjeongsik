import Link from "next/link"
import { Database, Map, Timer } from "lucide-react"

// v4 리디자인 — 좌측 정렬 히어로, 그라데이션·텍스트 클립 폐기.
// 배경은 흰색(아래 회색 섹션과 층위 대비), CTA는 단색 브랜드.

const DATA_POINTS = [
  { icon: <Database size={13} />, label: "공공데이터 인허가 기반" },
  { icon: <Map size={13} />, label: "마포구 16개 동 경계·밀도" },
  { icon: <Timer size={13} />, label: "리포트 생성 10초" },
] as const

export default function LandingHero() {
  return (
    <section className="w-full bg-white border-b border-[#E4E7EC]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          {/* 상단 배지 */}
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F7F8FA] px-3.5 py-1.5 text-[12px] font-bold text-[#475569] mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" />
            에어비앤비 창업 입지 분석 · 서울 마포구 오픈
          </span>

          {/* 슬로건 */}
          <h1
            className="font-black text-[#0F172A]"
            style={{
              fontSize: "clamp(1.9rem, 5vw, 3rem)",
              lineHeight: "1.25",
              letterSpacing: "-0.04em",
            }}
          >
            숙소 입지부터 수익까지,
            <br />
            <span className="text-[#1D4ED8]">당신 방의 수익</span>을 위한
            <br className="sm:hidden" /> 단 하나의 공식
          </h1>
          <p
            className="mt-5 max-w-xl text-[#475569]"
            style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", lineHeight: "1.8" }}
          >
            지도에서 경쟁 숙소 밀도를 무료로 확인하고,
            <br className="hidden sm:block" />
            원하는 위치의 수익 분석 리포트까지 10초 만에 받아보세요.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-[10px] bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.98] px-8 py-[15px] text-[16px] font-extrabold text-white transition-all"
            >
              무료로 분석하기 →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-[10px] border border-[#D0D5DD] bg-white hover:bg-[#F7F8FA] px-6 py-[14px] text-[15px] font-bold text-[#374151] transition-colors"
            >
              요금제 보기
            </Link>
          </div>

          <p className="mt-4 text-[13px] font-medium text-[#64748B]">
            회원가입만 하면 <strong className="text-[#1D4ED8]">무료 분석 크레딧 1회</strong>가 자동
            지급됩니다.
          </p>
        </div>

        {/* 데이터 소스 스트립 — 신뢰 신호 */}
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#E4E7EC] pt-5">
          {DATA_POINTS.map((d) => (
            <span key={d.label} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
              <span className="text-[#94A3B8]">{d.icon}</span>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
