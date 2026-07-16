'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const ExploreMapView = dynamic(() => import('@/components/explore/ExploreMapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#F7F8FA]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1D4ED8]" />
        <p className="text-[13px] text-[#64748B]">지도를 불러오는 중...</p>
      </div>
    </div>
  ),
})

export default function ExploreMapClientWrapper() {
  return <ExploreMapView />
}
