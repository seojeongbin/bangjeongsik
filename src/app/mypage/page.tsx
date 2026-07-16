import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import MyPageContent from '@/components/mypage/MyPageContent'

export const metadata: Metadata = {
  title: '마이페이지 — f(방)정식',
  description: '내 크레딧·구독·분석 리포트를 한 곳에서 확인하세요.',
}

// Phase 2-2I — 마이페이지. 조회 전용(크레딧 차감·결제·인증 로직 무변경).
// 데이터 조회는 전부 기존/신규 조회 API(RLS 본인 행만)를 클라이언트에서 호출.
export default function MyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#F7F8FA] pb-16">
        <MyPageContent />
      </main>
    </>
  )
}
