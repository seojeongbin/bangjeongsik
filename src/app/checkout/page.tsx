'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { MapPin, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ReportLockScreen from '@/components/report/ReportLockScreen'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const dong = searchParams.get('dong')

  const [address, setAddress] = useState('')

  function openPostcode() {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete(data) {
        const selected = data.addressType === 'R' ? data.roadAddress : data.jibunAddress
        setAddress(selected)
      },
    }).open()
  }

  return (
    <div className="min-h-screen bg-[#F0F5FF]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E2EAF8]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={dong ? '/explore' : '/'}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <ArrowLeft size={16} className="text-[#64748B]" />
          </Link>
          <div>
            <p className="font-black text-[#0F172A]" style={{ fontSize: '15px', letterSpacing: '-0.03em' }}>
              f(방)정식
            </p>
            <p className="text-[#64748B]" style={{ fontSize: '12px' }}>입지 분석 리포트 구매</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        {/* 주소 입력 카드 */}
        <div
          className="bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <h1
            className="font-black text-[#0F172A] mb-1"
            style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', letterSpacing: '-0.03em' }}
          >
            분석할 주소를 입력하세요
          </h1>
          <p className="text-[#64748B] mb-5" style={{ fontSize: '13px' }}>
            {dong
              ? `${dong} 매물의 정확한 주소를 입력하면 통합 입지 분석 리포트를 제공합니다.`
              : '주소 1개 기준으로 통합 입지 분석 리포트를 제공합니다.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* 주소 표시 영역 */}
            <div
              role="button"
              tabIndex={0}
              onClick={openPostcode}
              onKeyDown={(e) => e.key === 'Enter' && openPostcode()}
              className="flex flex-1 cursor-pointer items-center gap-2 rounded-[11px] border-[1.5px] border-[#CBD5E1] bg-white px-4"
              style={{ height: '50px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', touchAction: 'manipulation' }}
            >
              <MapPin size={16} className="shrink-0 text-[#94A3B8]" />
              <span
                className="flex-1 select-none truncate"
                style={{ fontSize: '14px', color: address ? '#0F172A' : '#9CA3AF' }}
              >
                {address || (dong ? `${dong} 매물 주소를 검색해 주세요` : '주소를 검색해 주세요')}
              </span>
            </div>

            <button
              type="button"
              onClick={openPostcode}
              className="shrink-0 cursor-pointer font-bold text-[#1a56db] rounded-[11px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] hover:bg-[#E0EDFF] transition-colors"
              style={{ fontSize: '14px', padding: '0 18px', height: '50px', touchAction: 'manipulation' }}
            >
              <Search size={14} className="inline mr-1.5 -mt-0.5" />
              주소 검색
            </button>
          </div>
        </div>

        {/* 결제 카드 — 주소 입력 후 표시 */}
        {address && <ReportLockScreen address={address} />}
      </div>

      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
