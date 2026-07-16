import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ExploreMapClientWrapper from '@/components/explore/ExploreMapClientWrapper'
import CreditBalance from '@/components/layout/CreditBalance'

export default function ExplorePage() {
  return (
    <div className="h-dvh flex flex-col">
      {/* 헤더 */}
      <div className="flex-none bg-white border-b border-[#E4E7EC] z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F3F6] transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} className="text-[#475569]" />
            </Link>
            <div className="min-w-0">
              <p
                className="font-extrabold text-[#0F172A] truncate"
                style={{ fontSize: '15px', letterSpacing: '-0.03em' }}
              >
                <span className="text-[#1D4ED8]">f(방)정식</span> — 마포구 입지 탐색
              </p>
              <p className="text-[#64748B] truncate" style={{ fontSize: '11px' }}>
                동별 경쟁밀도 무료 열람 · 정밀 분석은 크레딧 1회 차감
              </p>
            </div>
          </div>
          <CreditBalance />
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <ExploreMapClientWrapper />
      </div>
    </div>
  )
}
