import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ExploreMapClientWrapper from '@/components/explore/ExploreMapClientWrapper'

export default function ExplorePage() {
  return (
    <div className="h-dvh flex flex-col">
      {/* 헤더 */}
      <div
        className="flex-none bg-white border-b border-[#E2EAF8] z-10"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <ArrowLeft size={16} className="text-[#64748B]" />
          </Link>
          <div>
            <p
              className="font-black text-[#0F172A]"
              style={{ fontSize: '15px', letterSpacing: '-0.03em' }}
            >
              f(방)정식 — 마포구 입지 탐색
            </p>
            <p className="text-[#64748B]" style={{ fontSize: '11px' }}>
              동별 경쟁밀도 무료 열람 · 종합점수는 결제 후 공개
            </p>
          </div>
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <ExploreMapClientWrapper />
      </div>
    </div>
  )
}
