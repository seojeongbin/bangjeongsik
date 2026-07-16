'use client'

import { useEffect, useRef, useState } from 'react'
import type { Seasonality } from '@/lib/report/seasonality'

// Phase 2-2F — 수익성 계산기 (구 ReportSimulator 대체, docs/향후 개발단계.txt 스펙).
// 성수기/비수기 개월수·매출 기본값은 계절성 차트와 동일한 실데이터 도출값
// (deriveSeasonality) — 하드코딩 금지. 모든 입력은 사용자가 수정 가능.
// 스펙 변경으로 실데이터가 갱신되면 사용자가 손대지 않은 필드만 새 기본값으로 동기화.

const RENT_SAFETY = 0.7 // 월세 상한선 안전 여유 — 매출 변동 대비 30% 마진

function num(s: string): number {
  const n = Number(s.replace(/[^0-9]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

type FieldKey = 'peakRev' | 'offRev' | 'peakMonths' | 'fee'

function defaultsFrom(s: Seasonality | null) {
  if (!s) return { peakRev: '', offRev: '', peakMonths: '7', fee: '' }
  return {
    peakRev: String(Math.round(s.peakAvg / 10000)),
    offRev: String(Math.round(s.offAvg / 10000)),
    peakMonths: String(s.peakCount),
    // 플랫폼 수수료 등 — 평균 매출의 3% 초기값 (수정 가능)
    fee: String(Math.round((s.monthlyAvg * 0.03) / 10000)),
  }
}

// ─── 소형 입력 필드 ───────────────────────────────────────────────────────────

function CalcInput({
  label,
  value,
  onChange,
  suffix = '만원',
  hint,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  hint?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder ?? '0'}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          className="w-full h-[38px] px-3 pr-12 text-[13px] font-semibold text-[#0F172A] bg-white border border-[#D0D5DD] rounded-[9px] placeholder:text-[#C4CEDC] placeholder:font-normal focus:outline-none focus:border-[#1D4ED8] transition-[border-color] tabular-nums"
        />
        <span className="absolute right-3 text-[11px] text-[#94A3B8] font-medium pointer-events-none">
          {suffix}
        </span>
      </div>
      {hint && <p className="mt-1 text-[10px] text-[#94A3B8] leading-snug">{hint}</p>}
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-[#475569] uppercase tracking-wide">{children}</p>
  )
}

// ─── 본체 ─────────────────────────────────────────────────────────────────────

export default function ProfitCalculator({ seasonality }: { seasonality: Seasonality | null }) {
  const init = defaultsFrom(seasonality)

  // 실데이터 파생 필드 (스펙 변경 시 동기화 대상)
  const [peakRev, setPeakRev] = useState(init.peakRev)
  const [offRev, setOffRev] = useState(init.offRev)
  const [peakMonths, setPeakMonths] = useState(init.peakMonths)
  const [fee, setFee] = useState(init.fee)
  // 사용자 조건 필드
  const [rent, setRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [setup, setSetup] = useState('300')
  const [cleaning, setCleaning] = useState('0')
  const [utility, setUtility] = useState('25')
  const [supplies, setSupplies] = useState('10')

  // 사용자가 직접 수정한 파생 필드는 실데이터 갱신 시 덮어쓰지 않음
  const dirtyRef = useRef<Set<FieldKey>>(new Set())
  const markDirty = (key: FieldKey) => dirtyRef.current.add(key)

  const seasonKey = seasonality
    ? `${seasonality.monthlyAvg}|${seasonality.peakCount}|${seasonality.peakAvg}`
    : 'none'
  const prevKeyRef = useRef(seasonKey)
  useEffect(() => {
    if (prevKeyRef.current === seasonKey) return
    prevKeyRef.current = seasonKey
    const d = defaultsFrom(seasonality)
    if (!dirtyRef.current.has('peakRev')) setPeakRev(d.peakRev)
    if (!dirtyRef.current.has('offRev')) setOffRev(d.offRev)
    if (!dirtyRef.current.has('peakMonths')) setPeakMonths(d.peakMonths)
    if (!dirtyRef.current.has('fee')) setFee(d.fee)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonKey])

  // ─── 계산 (만원 단위, 실시간) ────────────────────────────────────────────────
  const peakN = Math.min(12, Math.max(0, num(peakMonths)))
  const offN = 12 - peakN
  const avgMonthly = (num(peakRev) * peakN + num(offRev) * offN) / 12
  const fixedCosts = num(cleaning) + num(utility) + num(supplies) + num(fee)
  const rentCap = Math.max(0, (avgMonthly - fixedCosts) * RENT_SAFETY)

  const hasRent = rent !== '' && num(rent) > 0
  const rentVal = num(rent)
  const leftover = hasRent ? avgMonthly - fixedCosts - rentVal : null
  const setupVal = num(setup)
  const paybackMonths =
    leftover !== null && leftover > 0 && setupVal > 0 ? setupVal / leftover : null

  const ready = avgMonthly > 0

  return (
    <div className="space-y-5">
      {seasonality && (
        <div className="rounded-[10px] border border-[#BDD0F5] bg-[#EEF4FF] px-4 py-2.5 text-[12px] text-[#1D4ED8]" style={{ lineHeight: '1.6' }}>
          성수기 {seasonality.peakCount}개월 / 비수기 {seasonality.offCount}개월과 매출 기본값은{' '}
          <strong>이 위치 실데이터(AirROI 추정)</strong>로 채워졌습니다. 모든 값은 직접 수정할 수 있습니다.
        </div>
      )}

      {/* 매출 — 실데이터 기본값 */}
      <div className="space-y-2.5">
        <GroupLabel>매출 (실데이터 기본값)</GroupLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <CalcInput
            label="성수기 월매출"
            value={peakRev}
            onChange={(v) => { setPeakRev(v); markDirty('peakRev') }}
          />
          <CalcInput
            label="비수기 월매출"
            value={offRev}
            onChange={(v) => { setOffRev(v); markDirty('offRev') }}
          />
          <CalcInput
            label="성수기 개월수"
            suffix="개월"
            value={peakMonths}
            onChange={(v) => { setPeakMonths(v); markDirty('peakMonths') }}
            hint={`비수기 ${offN}개월 자동 적용`}
          />
        </div>
      </div>

      {/* 매달 나가는 돈 */}
      <div className="space-y-2.5">
        <GroupLabel>매달 나가는 돈 (월세 제외)</GroupLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <CalcInput
            label="청소비"
            value={cleaning}
            onChange={setCleaning}
            hint="직접 청소하면 0원"
          />
          <CalcInput label="공과금·인터넷" value={utility} onChange={setUtility} />
          <CalcInput label="소모품·잡비" value={supplies} onChange={setSupplies} />
          <CalcInput
            label="플랫폼 수수료 등"
            value={fee}
            onChange={(v) => { setFee(v); markDirty('fee') }}
            hint="매출의 3%로 초기 계산"
          />
        </div>
      </div>

      {/* 내 조건 */}
      <div className="space-y-2.5">
        <GroupLabel>내 조건</GroupLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <CalcInput
            label="월세"
            value={rent}
            onChange={setRent}
            placeholder="예: 150"
            hint="입력하면 남는 돈·회수기간 계산"
          />
          <CalcInput
            label="셋업비 (안 돌려받는 돈)"
            value={setup}
            onChange={setSetup}
            hint="전대·풀옵션 최저 기준 기본값"
          />
          <CalcInput
            label="보증금"
            value={deposit}
            onChange={setDeposit}
            placeholder="예: 1,000"
            hint="돌려받는 돈 — 회수 계산에서 제외"
          />
        </div>
      </div>

      {/* 결과 표 — 항목당 한 줄 */}
      {ready && (
        <div className="rounded-[14px] border border-[#E4E7EC] overflow-hidden bg-white">
          <table className="w-full tabular-nums" style={{ fontSize: '13px' }}>
            <tbody>
              <tr className="border-b border-[#EEF0F4]">
                <td className="px-4 py-3 text-[#64748B]">1년 평균 월매출</td>
                <td className="px-4 py-3 text-right font-black text-[#0F172A]">
                  {fmt(avgMonthly)}만원
                </td>
              </tr>
              <tr className="border-b border-[#EEF0F4]">
                <td className="px-4 py-3 text-[#64748B]">
                  매달 나가는 돈{hasRent ? ' (월세 포함)' : ' (월세 제외)'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#0F172A]">
                  {fmt(fixedCosts + (hasRent ? rentVal : 0))}만원
                </td>
              </tr>
              <tr className="border-b border-[#EEF0F4]" style={{ background: '#EEF4FF' }}>
                <td className="px-4 py-3.5">
                  <span className="font-bold text-[#1D4ED8]">★ 월세 상한선</span>
                  <p className="text-[10px] text-[#64748B] mt-0.5">매출 변동 대비 30% 여유 반영</p>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="font-black text-[#1D4ED8]" style={{ fontSize: '1.35rem', letterSpacing: '-0.03em' }}>
                    {fmt(rentCap)}만원
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[#EEF0F4]">
                <td className="px-4 py-3 text-[#64748B]">매달 남는 돈</td>
                <td className="px-4 py-3 text-right">
                  {leftover !== null ? (
                    <span
                      className="font-black"
                      style={{ color: leftover >= 0 ? '#16A34A' : '#DC2626' }}
                    >
                      {fmt(leftover)}만원
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#94A3B8]">월세를 입력하세요</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[#64748B]">
                  회수기간
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">셋업비 기준 · 보증금 제외</p>
                </td>
                <td className="px-4 py-3 text-right">
                  {!hasRent ? (
                    <span className="text-[12px] text-[#94A3B8]">월세를 입력하세요</span>
                  ) : paybackMonths !== null ? (
                    <span className="font-black text-[#D97706]">
                      약 {paybackMonths < 1 ? 1 : Math.ceil(paybackMonths)}개월
                    </span>
                  ) : (
                    <span className="font-bold text-[#DC2626]">회수 불가 (적자)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 한 줄 결론 */}
      {ready && (
        <div
          className="rounded-[12px] px-4 py-3.5 flex flex-wrap items-center gap-2"
          style={{
            background: hasRent
              ? rentVal <= rentCap
                ? '#F0FDF4'
                : '#FEF2F2'
              : '#EEF4FF',
            border: `1.5px solid ${hasRent ? (rentVal <= rentCap ? '#BBF7D0' : '#FECACA') : '#BDD0F5'}`,
          }}
        >
          <p className="text-[13px] font-bold text-[#0F172A]" style={{ lineHeight: '1.6' }}>
            월세 <span className="text-[#1D4ED8]">{fmt(rentCap)}만원</span> 이하면 해볼 만,
            넘으면 위험합니다.
          </p>
          {hasRent && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold"
              style={
                rentVal <= rentCap
                  ? { background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }
                  : { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }
              }
            >
              내 월세 {fmt(rentVal)}만원 — {rentVal <= rentCap ? '해볼 만' : '위험'}
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#94A3B8]" style={{ lineHeight: '1.7' }}>
        모든 수치는 만원 단위 참고용 추정치입니다. 매출 기본값은 AirROI 통계 기반이며 실제와 다를 수 있습니다.
      </p>
    </div>
  )
}
