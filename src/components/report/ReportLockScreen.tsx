'use client'

import { useState } from 'react'
import { Lock, Check, X, Loader2, MapPin, BarChart3, Building2, TrendingUp, BookOpen } from 'lucide-react'
import { PAYMENT } from '@/constants/messages'

interface Props {
  address: string
}

const SECTION_ICONS = [
  { icon: MapPin, label: '경쟁밀도 — 반경 500m 내 외도민 수 + 강도 분석' },
  { icon: Building2, label: '건축물대장 — 외도민 등록 가능성 추정' },
  { icon: TrendingUp, label: 'AirROI 수익 데이터 — 동네 평균 ADR·예약률·월수익' },
  { icon: BarChart3, label: '수익 시뮬레이터 — 순수익·ROI·원금회수기간' },
  { icon: BookOpen, label: '창업 가계부 — 12개월 예상 손익표' },
]

export default function ReportLockScreen({ address }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayment() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '결제 세션 생성에 실패했습니다.')
        setIsLoading(false)
        return
      }
      // Polar 결제 페이지로 리다이렉트
      window.location.href = json.url
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* 잠금 카드 */}
      <div
        className="rounded-[18px] border border-[#E2EAF8] overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #ffffff 0%, #F0F5FF 100%)', boxShadow: '0 4px 24px rgba(26,86,219,0.10)' }}
      >
        {/* 블러 미리보기 헤더 */}
        <div className="px-6 py-4 border-b border-[#E2EAF8] bg-[#F8FAFF]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF4FF] flex items-center justify-center">
              <Lock size={15} className="text-[#1a56db]" />
            </div>
            <div>
              <p className="font-bold text-[#0F172A]" style={{ fontSize: '14px' }}>통합 입지 분석 리포트</p>
              <p className="text-[#64748B]" style={{ fontSize: '12px' }}>결제 후 즉시 열람 가능</p>
            </div>
          </div>
        </div>

        {/* 포함 항목 */}
        <div className="px-6 py-5">
          <p className="text-[12px] font-semibold text-[#94A3B8] mb-3 uppercase tracking-wide">포함 항목</p>
          <ul className="space-y-2.5">
            {SECTION_ICONS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
                </span>
                <span className="text-[13px] text-[#334155]">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 가격 + CTA */}
        <div
          className="px-6 py-5 border-t border-[#E2EAF8]"
          style={{ background: 'linear-gradient(135deg, #EEF4FF 0%, #F0F5FF 100%)' }}
        >
          {/* 가격 */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-black text-[#0F172A]" style={{ fontSize: '1.75rem', letterSpacing: '-0.04em' }}>
              {PAYMENT.price}
            </span>
            <span className="text-[12px] text-[#64748B]">{PAYMENT.priceNote}</span>
          </div>
          <p className="text-[12px] text-[#64748B] mb-4">{PAYMENT.accessPeriod}</p>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
            className="w-full py-[14px] rounded-[12px] text-white font-extrabold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
              boxShadow: '0 8px 24px rgba(26,86,219,0.35)',
              touchAction: 'manipulation',
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 size={16} className="animate-spin" />
                결제 페이지로 이동 중...
              </span>
            ) : (
              `${PAYMENT.price} 결제하고 정밀 리포트 보기 →`
            )}
          </button>

          {error && (
            <p className="mt-3 text-center text-[13px] text-[#DC2626]">{error}</p>
          )}

          {/* 환불 정책 */}
          <p className="mt-3 text-[11px] text-[#94A3B8] text-center leading-relaxed">
            {PAYMENT.refundPolicy}
            {' '}문의:{' '}
            <a href={`mailto:${PAYMENT.contactEmail}`} className="underline">
              {PAYMENT.contactEmail}
            </a>
          </p>
        </div>
      </div>

      {/* 결제 전 확인 모달 */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}
        >
          <div
            className="w-full max-w-sm rounded-[20px] overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2EAF8]">
              <span className="font-bold text-[#0F172A]" style={{ fontSize: '15px' }}>결제 확인</span>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
              >
                <X size={16} className="text-[#64748B]" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-[12px] bg-[#F8FAFF] border border-[#E2EAF8] p-4 space-y-2">
                <Row label="결제 금액" value={PAYMENT.price} highlight />
                <Row label="분석 주소" value={address} />
                <Row label="제공 내역" value={PAYMENT.product} />
                <Row label="열람 기간" value={PAYMENT.accessPeriod} />
              </div>

              <div
                className="rounded-r-[10px] px-4 py-3 text-[12px] text-[#64748B]"
                style={{ borderLeft: '3px solid #93C5FD', background: '#F8FAFF', lineHeight: '1.7' }}
              >
                <strong className="text-[#0F172A]">환불 정책:</strong>{' '}
                {PAYMENT.refundPolicy}
              </div>
            </div>

            {/* 모달 버튼 */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-[13px] rounded-[11px] font-bold text-[14px] text-[#64748B] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFF] transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); handlePayment() }}
                disabled={isLoading}
                className="flex-1 py-[13px] rounded-[11px] font-extrabold text-[14px] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
                  boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
                }}
              >
                {PAYMENT.price} 결제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3" style={{ fontSize: '13px' }}>
      <span className="text-[#94A3B8] shrink-0">{label}</span>
      <span className={`text-right ${highlight ? 'font-black text-[#1a56db] text-[15px]' : 'font-semibold text-[#0F172A]'}`}>
        {value}
      </span>
    </div>
  )
}
