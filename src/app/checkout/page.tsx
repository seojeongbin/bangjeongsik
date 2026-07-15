'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import AuthButton from '@/components/auth/AuthButton'
import { CREDIT_PLANS, CREDIT_PAYMENT, SUBSCRIPTION_PLAN } from '@/constants/messages'

// 단건 2종 + 월간 구독 (Phase 2-2H)
const ALL_PLANS = { ...CREDIT_PLANS, sub_basic: SUBSCRIPTION_PLAN } as const
type PlanId = keyof typeof ALL_PLANS

interface SubInfo {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

function formatKoDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const dong = searchParams.get('dong')
  const planParam = searchParams.get('plan')

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedRaw, setSelected] = useState<PlanId>(
    planParam && planParam in ALL_PLANS ? (planParam as PlanId) : 'basic',
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 구독 상태 (로그인 시 조회) — undefined: 조회 전, null: 구독 없음
  const [sub, setSub] = useState<SubInfo | null | undefined>(undefined)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/subscription')
      .then((res) => (res.ok ? res.json() : { subscription: null }))
      .then((json) => {
        if (!cancelled) setSub(json.subscription ?? null)
      })
      .catch(() => {
        if (!cancelled) setSub(null)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // 로그아웃 시 구독 상태 무시 (재로그인 시 effect가 재조회)
  const isSubscribed = !!user && !!sub
  // 이미 구독 중이면 구독 플랜 선택을 단건으로 강등 — 파생값 (effect setState 금지)
  const selected: PlanId = isSubscribed && selectedRaw === 'sub_basic' ? 'basic' : selectedRaw

  async function openPortal() {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscription/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '구독 관리 페이지 연결에 실패했습니다.')
        setPortalLoading(false)
        return
      }
      window.location.href = json.url
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setPortalLoading(false)
    }
  }

  async function handlePayment() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(
          res.status === 401
            ? '로그인이 필요합니다. 로그인 후 다시 시도해주세요.'
            : json.error ?? '결제 세션 생성에 실패했습니다.',
        )
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

  const plan = ALL_PLANS[selected]
  const isSubPlan = selected === 'sub_basic'

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
            <p className="text-[#64748B]" style={{ fontSize: '12px' }}>분석 크레딧 구매</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        {/* 안내 카드 */}
        <div
          className="bg-white border border-[#E2EAF8] rounded-[18px] p-5 sm:p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <h1
            className="font-black text-[#0F172A] mb-1"
            style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', letterSpacing: '-0.03em' }}
          >
            분석 크레딧을 선택하세요
          </h1>
          <p className="text-[#64748B] mb-4" style={{ fontSize: '13px', lineHeight: '1.7' }}>
            {CREDIT_PAYMENT.usage}
          </p>

          {/* 로그인 안내 — 크레딧은 계정 귀속 */}
          {!authLoading && !user && (
            <div
              className="rounded-[12px] px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ borderLeft: '3px solid #F59E0B', background: '#FFFBEB' }}
            >
              <p className="flex-1 text-[12px] text-[#92400E]" style={{ lineHeight: '1.6' }}>
                크레딧은 로그인 계정에 지급됩니다. 구매 전 로그인해주세요.
              </p>
              <AuthButton />
            </div>
          )}

          {/* 구독 중 안내 배너 (Phase 2-2H) */}
          {isSubscribed && sub && (
            <div
              className="rounded-[12px] px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ borderLeft: '3px solid #1a56db', background: '#EEF4FF' }}
            >
              <div className="flex-1 text-[12px] text-[#1e3a8a]" style={{ lineHeight: '1.6' }}>
                <p className="font-bold flex items-center gap-1.5">
                  <RefreshCw size={12} />
                  {SUBSCRIPTION_PLAN.name} 구독 중
                </p>
                <p className="mt-0.5">
                  {sub.status === 'past_due'
                    ? '최근 결제가 실패했습니다. 결제수단을 확인해주세요 (크레딧은 결제 완료 시 지급됩니다).'
                    : sub.cancelAtPeriodEnd
                      ? `해지 예약됨 — ${formatKoDate(sub.currentPeriodEnd)}까지 유지되며 이후 청구되지 않습니다.`
                      : `다음 갱신일: ${formatKoDate(sub.currentPeriodEnd)} (매달 크레딧 ${SUBSCRIPTION_PLAN.credits}회 자동 충전)`}
                </p>
              </div>
              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="shrink-0 px-3 py-2 rounded-[10px] text-[12px] font-bold text-[#1a56db] bg-white border border-[#BDD0F5] hover:bg-[#F8FAFF] transition-colors disabled:opacity-50"
              >
                {portalLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    연결 중...
                  </span>
                ) : (
                  '구독 관리 (해지·결제수단)'
                )}
              </button>
            </div>
          )}

          {/* 플랜 카드 3종 — 단건 2종 + 월간 구독 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(ALL_PLANS) as PlanId[]).map((id) => {
              const p = ALL_PLANS[id]
              const active = selected === id
              const disabled = id === 'sub_basic' && isSubscribed
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => !disabled && setSelected(id)}
                  disabled={disabled}
                  className="text-left rounded-[14px] p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    border: active ? '2px solid #1a56db' : '1.5px solid #CBD5E1',
                    background: active ? '#EEF4FF' : '#fff',
                    boxShadow: active ? '0 4px 16px rgba(26,86,219,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
                    touchAction: 'manipulation',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-1">
                    <span className="font-extrabold text-[#0F172A]" style={{ fontSize: '15px' }}>
                      {p.name}
                    </span>
                    {id === 'pro' && (
                      <span
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-bold text-white"
                        style={{ fontSize: '10px', background: 'linear-gradient(135deg, #1a56db, #0ea5e9)' }}
                      >
                        <Sparkles size={9} />
                        1회 무료
                      </span>
                    )}
                    {id === 'sub_basic' && (
                      <span
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-bold text-white"
                        style={{ fontSize: '10px', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
                      >
                        <RefreshCw size={9} />
                        {disabled ? '구독 중' : '매달 +1회'}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#64748B] mb-2">{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-black text-[#0F172A]" style={{ fontSize: '1.3rem', letterSpacing: '-0.04em' }}>
                      {p.price}
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">{p.unitNote}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 결제 카드 */}
        <div
          className="rounded-[18px] border border-[#E2EAF8] overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #ffffff 0%, #F0F5FF 100%)', boxShadow: '0 4px 24px rgba(26,86,219,0.10)' }}
        >
          <div className="px-6 py-5">
            <p className="text-[12px] font-semibold text-[#94A3B8] mb-3 uppercase tracking-wide">크레딧으로 열리는 것</p>
            <ul className="space-y-2.5">
              {[
                '경쟁밀도 — 반경 내 외도민 수 + 강도 분석',
                '건축물대장 — 외도민 등록 가능성 추정',
                'AirROI 수익 데이터 — 동네 평균 ADR·예약률·월수익',
                '수익 시뮬레이터 — 순수익·ROI·원금회수기간',
                '창업 가계부 — 12개월 예상 손익표',
              ].map((label) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
                  </span>
                  <span className="text-[13px] text-[#334155]">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="px-6 py-5 border-t border-[#E2EAF8]"
            style={{ background: 'linear-gradient(135deg, #EEF4FF 0%, #F0F5FF 100%)' }}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-black text-[#0F172A]" style={{ fontSize: '1.75rem', letterSpacing: '-0.04em' }}>
                {plan.price}
              </span>
              <span className="text-[12px] text-[#64748B]">
                {plan.name} · {isSubPlan ? `매달 분석 ${plan.credits}회 자동 충전` : `분석 ${plan.credits}회`} · {CREDIT_PAYMENT.priceNote}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={isLoading || authLoading || !user}
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
              ) : !authLoading && !user ? (
                '로그인 후 구매할 수 있습니다'
              ) : isSubPlan ? (
                `${plan.price} 구독하고 매달 크레딧 ${plan.credits}회 받기 →`
              ) : (
                `${plan.price} 결제하고 크레딧 ${plan.credits}회 받기 →`
              )}
            </button>

            {error && (
              <p className="mt-3 text-center text-[13px] text-[#DC2626]">{error}</p>
            )}

            <p className="mt-3 text-[11px] text-[#94A3B8] text-center leading-relaxed">
              {isSubPlan ? CREDIT_PAYMENT.subscriptionPolicy : CREDIT_PAYMENT.refundPolicy}
              {CREDIT_PAYMENT.contactEmail && (
                <>
                  {' '}문의:{' '}
                  <a href={`mailto:${CREDIT_PAYMENT.contactEmail}`} className="underline">
                    {CREDIT_PAYMENT.contactEmail}
                  </a>
                </>
              )}
            </p>
          </div>
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

            <div className="px-5 py-5 space-y-4">
              <div className="rounded-[12px] bg-[#F8FAFF] border border-[#E2EAF8] p-4 space-y-2">
                <Row label="결제 금액" value={isSubPlan ? `${plan.price} (매달 자동결제)` : plan.price} highlight />
                <Row label="상품" value={`${plan.name} — ${plan.desc}`} />
                <Row label="지급 크레딧" value={isSubPlan ? `매달 분석 ${plan.credits}회 (3회 + 무료 1회)` : `분석 ${plan.credits}회`} />
                <Row label="사용 방법" value="분석 1회당 크레딧 1개 차감" />
                {isSubPlan && <Row label="해지" value="언제든 가능 · 다음 결제일부터 미청구" />}
              </div>

              <div
                className="rounded-r-[10px] px-4 py-3 text-[12px] text-[#64748B]"
                style={{ borderLeft: '3px solid #93C5FD', background: '#F8FAFF', lineHeight: '1.7' }}
              >
                <strong className="text-[#0F172A]">{isSubPlan ? '구독·환불 정책' : '환불 정책'}:</strong>{' '}
                {isSubPlan ? CREDIT_PAYMENT.subscriptionPolicy : CREDIT_PAYMENT.refundPolicy}
              </div>
            </div>

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
                {isSubPlan ? `${plan.price} 구독 시작하기` : `${plan.price} 결제하기`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
