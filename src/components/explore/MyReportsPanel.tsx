'use client'

import { useEffect, useState } from 'react'
import { X, History, Loader2, MapPin, ChevronRight } from 'lucide-react'
import { kakaoSignIn } from '@/lib/kakaoSignIn'
import type { AnalysisListItem, AnalysisResponse } from '@/types/analysis'

// Phase 2-2G — 내 분석 기록 목록 (재방문 동선). RLS가 본인 행만 반환,
// 재열람(GET /api/analysis/[id])은 크레딧 차감 없음.

type ListStatus = 'loading' | 'ready' | 'unauthed' | 'error'

function fmtRadius(m: number) {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  onClose: () => void
  /** 재열람 데이터 로드 완료 → 부모가 AnalysisPanel을 연다 */
  onOpen: (analysis: AnalysisResponse) => void
}

export default function MyReportsPanel({ onClose, onOpen }: Props) {
  const [status, setStatus] = useState<ListStatus>('loading')
  const [reports, setReports] = useState<AnalysisListItem[]>([])
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/analysis')
        if (cancelled) return
        if (res.status === 401) {
          setStatus('unauthed')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }
        const data = (await res.json()) as { reports: AnalysisListItem[] }
        if (cancelled) return
        setReports(data.reports)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function openReport(item: AnalysisListItem) {
    if (openingId) return
    setOpeningId(item.id)
    setOpenError(null)
    try {
      const res = await fetch(`/api/analysis/${item.id}`)
      if (!res.ok) throw new Error('FETCH_FAILED')
      const body = (await res.json()) as AnalysisResponse
      onOpen(body)
    } catch {
      setOpenError('리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[72dvh] z-30 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-[360px]">
      <div className="h-full bg-white rounded-t-[20px] sm:rounded-none flex flex-col shadow-[0_-4px_28px_rgba(0,0,0,0.16)] sm:shadow-[-4px_0_28px_rgba(0,0,0,0.16)]">
        {/* 헤더 */}
        <div className="flex-none px-5 pt-4 pb-3 border-b border-[#E2EAF8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History size={15} className="text-[#1a56db]" />
            <h2 className="font-black text-[#0F172A]" style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
              내 분석 기록
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <X size={14} className="text-[#64748B]" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[#1a56db]" />
            </div>
          )}

          {status === 'unauthed' && (
            <div className="py-6 text-center">
              <p className="text-[13px] font-bold text-[#0F172A] mb-1">로그인이 필요합니다</p>
              <p className="text-[12px] text-[#64748B] mb-3" style={{ lineHeight: 1.6 }}>
                분석 기록은 로그인 계정에 저장됩니다.
                <br />
                가입 시 무료 분석 1회가 지급됩니다.
              </p>
              <button
                type="button"
                onClick={() => void kakaoSignIn()}
                className="rounded-[10px] border-[1.5px] border-[#BDD0F5] bg-[#EEF4FF] px-4 py-2 text-[13px] font-bold text-[#1a56db]"
              >
                카카오 로그인
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="py-6 text-center text-[12px] text-[#64748B]">
              기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}

          {status === 'ready' && reports.length === 0 && (
            <div className="py-8 text-center">
              <MapPin size={22} className="text-[#CBD5E1] mx-auto mb-2" />
              <p className="text-[13px] font-bold text-[#0F172A] mb-1">아직 분석 기록이 없습니다</p>
              <p className="text-[12px] text-[#64748B]" style={{ lineHeight: 1.6 }}>
                지도에서 원하는 지점을 클릭하거나
                <br />
                주소를 검색해 첫 분석을 시작해보세요.
              </p>
            </div>
          )}

          {status === 'ready' && reports.length > 0 && (
            <>
              <p className="text-[11px] text-[#94A3B8] px-1 mb-2">
                재열람은 크레딧이 차감되지 않습니다.
              </p>
              {openError && (
                <p className="text-[12px] text-[#B91C1C] px-1 mb-2">{openError}</p>
              )}
              <ul className="space-y-2">
                {reports.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openReport(item)}
                      disabled={openingId !== null}
                      className="w-full text-left rounded-[12px] border border-[#E2EAF8] bg-white hover:border-[#1a56db] hover:bg-[#FAFBFF] transition-colors px-3.5 py-3 flex items-center gap-3 disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[#0F172A] truncate">
                          {item.address ?? '지도 선택 지점'}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          반경 {fmtRadius(item.radiusM)} · 방 {item.bedrooms}개 · {fmtDateTime(item.createdAt)}
                        </p>
                      </div>
                      {openingId === item.id ? (
                        <Loader2 size={15} className="animate-spin text-[#1a56db] shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-[#CBD5E1] shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
