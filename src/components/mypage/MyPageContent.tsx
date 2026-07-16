'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User as UserIcon,
  Coins,
  RefreshCw,
  Receipt,
  FileText,
  MapPin,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser'
import { kakaoSignIn } from '@/lib/kakaoSignIn'
import { SUBSCRIPTION_PLAN } from '@/constants/messages'
import ReportSections, { UnavailableNotice } from '@/components/report/ReportSections'
import type { AnalysisListItem, AnalysisResponse } from '@/types/analysis'

// Phase 2-2I — 마이페이지 본문. 조회 전용: 잔액·이력·구독·리포트 목록을
// 기존/신규 조회 API로만 읽는다 (크레딧 차감·결제 로직 호출 없음).

// ─── 크레딧 원장 reason → 사람이 읽는 한글 ────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  signup_free: '가입 무료 크레딧',
  purchase_basic: 'Basic 구매',
  purchase_pro: 'Pro 구매',
  subscription_monthly: '월간 구독 지급',
  consume_report: '분석 사용',
  refund: '환불',
}

interface CreditHistoryEntry {
  id: string
  delta: number
  reason: string
  createdAt: string
  balanceAfter: number
}

interface SubInfo {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function fmtKoDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtRadius(m: number) {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`
}

// ─── 공통 섹션 카드 (v4 — 경계선 구분, 그림자 없음) ───────────────────────────

function Section({
  title,
  icon,
  children,
  aside,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section className="bg-white border border-[#E4E7EC] rounded-[12px]">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[14px] font-bold text-[#0F172A]" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h2>
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ─── 리포트 재열람 오버레이 — ReportSections 재사용 (차감 없음) ────────────────

function ReportViewer({ analysis, onClose }: { analysis: AnalysisResponse; onClose: () => void }) {
  const { report, data } = analysis
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="h-full w-full sm:max-w-[600px] bg-[#F7F8FA] flex flex-col shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
        <div className="flex-none bg-white border-b border-[#E4E7EC] px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-[#0F172A] truncate text-[15px]" style={{ letterSpacing: '-0.02em' }}>
              {report.address ?? `지도 선택 지점 · 반경 ${fmtRadius(report.radiusM)}`}
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              {fmtDate(report.createdAt)} 분석 · 재열람은 크레딧이 차감되지 않습니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F3F6] transition-colors flex-shrink-0"
          >
            <X size={16} className="text-[#475569]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ReportSections
            key={analysis.reportToken}
            reportToken={analysis.reportToken}
            airbnb={data.airbnb}
            building={data.building}
            competitionCount={data.competitionCount}
            competitionRadiusM={report.radiusM}
            minbakUpdatedAt={data.minbakUpdatedAt}
            bedrooms={report.bedrooms}
            baths={report.baths}
            guests={report.guests}
            buildingSlot={
              report.address ? undefined : (
                <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-5">
                  <UnavailableNotice message="지도 선택 지점은 주소가 없어 건축물대장을 조회하지 않았습니다. /explore 분석 패널에서 주소로 직접 조회할 수 있어요." />
                </div>
              )
            }
          />
        </div>
      </div>
    </div>
  )
}

// ─── 본체 ─────────────────────────────────────────────────────────────────────

type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }

export default function MyPageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [history, setHistory] = useState<LoadState<{ entries: CreditHistoryEntry[]; balance: number }>>({ status: 'loading' })
  const [sub, setSub] = useState<SubInfo | null>(null)
  const [reports, setReports] = useState<LoadState<AnalysisListItem[]>>({ status: 'loading' })
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const [viewer, setViewer] = useState<AnalysisResponse | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

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

    fetch('/api/credits/history')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { entries: CreditHistoryEntry[]; balance: number }) => {
        if (!cancelled) setHistory({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setHistory({ status: 'error' })
      })

    fetch('/api/subscription')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscription?: SubInfo | null } | null) => {
        if (!cancelled && data?.subscription) setSub(data.subscription)
      })
      .catch(() => {
        // 구독 정보는 부가 정보 — 실패 시 미표시
      })

    fetch('/api/analysis')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { reports: AnalysisListItem[] }) => {
        if (!cancelled) setReports({ status: 'ready', data: data.reports })
      })
      .catch(() => {
        if (!cancelled) setReports({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function openPortal() {
    if (portalLoading) return
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/subscription/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setPortalError(json.error ?? '구독 관리 페이지 연결에 실패했습니다.')
        setPortalLoading(false)
        return
      }
      window.location.href = json.url
    } catch {
      setPortalError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setPortalLoading(false)
    }
  }

  async function openReport(item: AnalysisListItem) {
    if (openingId) return
    setOpeningId(item.id)
    setOpenError(null)
    try {
      const res = await fetch(`/api/analysis/${item.id}`)
      if (!res.ok) throw new Error('FETCH_FAILED')
      setViewer((await res.json()) as AnalysisResponse)
    } catch {
      setOpenError('리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setOpeningId(null)
    }
  }

  // ── 비로그인 / 로딩 ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-[#1D4ED8]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16">
        <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-8 text-center">
          <UserIcon size={26} className="mx-auto mb-3 text-[#94A3B8]" />
          <p className="text-[15px] font-bold text-[#0F172A] mb-1">로그인이 필요합니다</p>
          <p className="text-[13px] text-[#475569] mb-5" style={{ lineHeight: 1.7 }}>
            마이페이지는 로그인 계정의 크레딧·구독·분석 기록을 보여줍니다.
          </p>
          <button
            type="button"
            onClick={() => void kakaoSignIn()}
            className="w-full rounded-[10px] bg-[#1D4ED8] hover:bg-[#1E40AF] px-4 py-3 text-[14px] font-bold text-white transition-colors"
          >
            카카오 로그인
          </button>
        </div>
      </div>
    )
  }

  // ── 로그인 상태 본문 ─────────────────────────────────────────────────────────

  const nickname =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    '카카오 회원'
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null

  const balance = history.status === 'ready' ? history.data.balance : null

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 space-y-4">
      <h1 className="text-[1.4rem] font-extrabold text-[#0F172A] mb-1" style={{ letterSpacing: '-0.03em' }}>
        마이페이지
      </h1>

      {/* ① 계정 요약 */}
      <section className="bg-white border border-[#E4E7EC] rounded-[12px] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* 프로필 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {avatarUrl ? (
              // 카카오 CDN 프로필 이미지 — next/image 도메인 등록 없이 표시
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border border-[#E4E7EC] object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#F1F3F6] border border-[#E4E7EC] flex items-center justify-center flex-shrink-0">
                <UserIcon size={20} className="text-[#94A3B8]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#0F172A] truncate">{nickname}</p>
              <p className="text-[12px] text-[#64748B]">카카오 계정으로 로그인</p>
            </div>
          </div>

          {/* 크레딧 잔액 */}
          <div className="sm:text-right border-t sm:border-t-0 border-[#E4E7EC] pt-3 sm:pt-0">
            <p className="text-[12px] text-[#64748B] mb-0.5">보유 크레딧</p>
            <p className="tabular-nums">
              <span className="text-[1.6rem] font-black text-[#1D4ED8]" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {balance !== null ? balance : '—'}
              </span>
              <span className="ml-1 text-[13px] font-bold text-[#475569]">회</span>
            </p>
            <Link href="/pricing" className="inline-block mt-1 text-[12px] font-bold text-[#1D4ED8] hover:underline">
              크레딧 충전 →
            </Link>
          </div>
        </div>

        {/* 구독 상태 */}
        <div className="mt-4 rounded-[10px] border border-[#E4E7EC] bg-[#F8F9FB] px-4 py-3">
          {sub ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="flex-1 min-w-0 text-[12px] text-[#475569]" style={{ lineHeight: 1.6 }}>
                <p className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <RefreshCw size={12} className="text-[#1D4ED8]" />
                  {SUBSCRIPTION_PLAN.name} 구독 중
                </p>
                <p className="mt-0.5">
                  {sub.status === 'past_due'
                    ? '최근 결제가 실패했습니다. 결제수단을 확인해주세요 (크레딧은 결제 완료 시 지급됩니다).'
                    : sub.cancelAtPeriodEnd
                      ? `해지 예약됨 — ${fmtKoDate(sub.currentPeriodEnd)}까지 유지되며 이후 청구되지 않습니다.`
                      : `다음 갱신일: ${fmtKoDate(sub.currentPeriodEnd)} (매달 크레딧 ${SUBSCRIPTION_PLAN.credits}회 자동 충전)`}
                </p>
              </div>
              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="shrink-0 px-3 py-2 rounded-[10px] text-[12px] font-bold text-[#1D4ED8] bg-white border border-[#BDD0F5] hover:bg-[#EEF4FF] transition-colors disabled:opacity-50"
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
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[12px] text-[#475569]">
              <p className="flex-1">구독 중인 요금제가 없습니다. 월간 구독은 매달 크레딧 4회(3회 + 무료 1회)를 자동 충전합니다.</p>
              <Link href="/pricing?plan=sub_basic" className="shrink-0 font-bold text-[#1D4ED8] hover:underline">
                월간 구독 알아보기 →
              </Link>
            </div>
          )}
          {portalError && <p className="mt-2 text-[12px] text-[#DC2626]">{portalError}</p>}
        </div>
      </section>

      {/* ② 결제·크레딧 이력 */}
      <Section title="결제·크레딧 이력" icon={<Receipt size={15} className="text-[#1D4ED8]" />}>
        {history.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-[#1D4ED8]" />
          </div>
        )}
        {history.status === 'error' && (
          <p className="py-4 text-center text-[13px] text-[#64748B]">
            이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {history.status === 'ready' &&
          (history.data.entries.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#64748B]">아직 크레딧 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] text-[#64748B] border-b border-[#E4E7EC]">
                    <th className="text-left font-semibold py-2 pr-3">일시</th>
                    <th className="text-left font-semibold py-2 pr-3">내역</th>
                    <th className="text-right font-semibold py-2 pr-3">변동</th>
                    <th className="text-right font-semibold py-2">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.entries.map((e) => (
                    <tr key={e.id} className="border-b border-[#F1F3F6] last:border-0">
                      <td className="py-2.5 pr-3 text-[12px] text-[#64748B] whitespace-nowrap tabular-nums">
                        {fmtDate(e.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-[#0F172A]">
                        {REASON_LABELS[e.reason] ?? e.reason}
                      </td>
                      <td
                        className={`py-2.5 pr-3 text-right font-bold tabular-nums whitespace-nowrap ${
                          e.delta > 0 ? 'text-[#1D4ED8]' : 'text-[#DC2626]'
                        }`}
                      >
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#475569] tabular-nums whitespace-nowrap">
                        {e.balanceAfter}회
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </Section>

      {/* ③ 분석 리포트 이력 — 재열람 무차감 */}
      <Section
        title="분석 리포트 이력"
        icon={<FileText size={15} className="text-[#1D4ED8]" />}
        aside={<span className="text-[11px] text-[#94A3B8]">재열람 무료</span>}
      >
        {reports.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-[#1D4ED8]" />
          </div>
        )}
        {reports.status === 'error' && (
          <p className="py-4 text-center text-[13px] text-[#64748B]">
            기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {reports.status === 'ready' &&
          (reports.data.length === 0 ? (
            <div className="py-6 text-center">
              <MapPin size={20} className="text-[#D0D5DD] mx-auto mb-2" />
              <p className="text-[13px] font-bold text-[#0F172A] mb-1">아직 분석 기록이 없습니다</p>
              <p className="text-[12px] text-[#64748B] mb-3">지도에서 원하는 지점을 골라 첫 분석을 시작해보세요.</p>
              <Link
                href="/explore"
                className="inline-flex rounded-[10px] bg-[#1D4ED8] hover:bg-[#1E40AF] px-4 py-2 text-[13px] font-bold text-white transition-colors"
              >
                분석하러 가기 →
              </Link>
            </div>
          ) : (
            <>
              {openError && <p className="text-[12px] text-[#DC2626] mb-2">{openError}</p>}
              <ul className="divide-y divide-[#F1F3F6]">
                {reports.data.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openReport(item)}
                      disabled={openingId !== null}
                      className="w-full text-left py-3 flex items-center gap-3 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] transition-colors disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[#0F172A] truncate">
                          {item.address ?? '지도 선택 지점'}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 tabular-nums">
                          반경 {fmtRadius(item.radiusM)} · 방 {item.bedrooms}개 · {fmtDate(item.createdAt)}
                        </p>
                      </div>
                      {openingId === item.id ? (
                        <Loader2 size={15} className="animate-spin text-[#1D4ED8] shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-[#D0D5DD] shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ))}
      </Section>

      {/* 잔액 요약 각주 */}
      <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 px-1">
        <Coins size={11} />
        크레딧 잔액은 지급·사용 이력의 합계입니다. 결제 관련 문의는 요금제 페이지의 안내를 확인해주세요.
      </p>

      {viewer && <ReportViewer analysis={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}
