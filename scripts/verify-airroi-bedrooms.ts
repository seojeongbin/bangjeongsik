/**
 * 진단용 1회성 스크립트 — AirROI bedrooms/baths/guests 파라미터 변별력 검증
 *
 * 실행: npx tsx scripts/verify-airroi-bedrooms.ts
 * 실행 후 삭제 가능 (package.json에 등록 안 함)
 *
 * 목적: 같은 좌표에서 스펙 파라미터를 바꿨을 때 ADR/occupancy가
 *       의미 있게 달라지는지 확인 (Step C 광역 스무딩 함정 재검증)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// .env.local 수동 파싱
try {
  const envContent = readFileSync(join(ROOT, '.env.local'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // .env.local 없으면 환경변수가 이미 설정됐다고 가정
}

const AIRROI_API_KEY = process.env.AIRROI_API_KEY
if (!AIRROI_API_KEY) {
  console.error('❌ AIRROI_API_KEY 환경변수가 없습니다.')
  process.exit(1)
}

const BASE_URL = 'https://api.airroi.com'

// 서교동 centroid (외도민 307개, 마포구 최다 밀집 지역 — 기준선으로 적합)
const LAT = 37.554772
const LNG = 126.9209446

interface EstimateResponse {
  revenue: number
  average_daily_rate: number
  occupancy: number
  currency: string
  percentiles: {
    revenue: { p25: number; p75: number }
    average_daily_rate: { p25: number; p75: number }
    occupancy: { p25: number; p75: number }
  }
}

interface Combo {
  label: string
  bedrooms: number
  baths: number
  guests: number
}

const COMBOS: Combo[] = [
  { label: '1BR/1BA/2PAX', bedrooms: 1, baths: 1, guests: 2 },
  { label: '1BR/1BA/4PAX', bedrooms: 1, baths: 1, guests: 4 },
  { label: '2BR/1BA/4PAX ★기준', bedrooms: 2, baths: 1, guests: 4 },
  { label: '2BR/2BA/4PAX', bedrooms: 2, baths: 2, guests: 4 },
  { label: '3BR/2BA/6PAX', bedrooms: 3, baths: 2, guests: 6 },
  { label: '4BR/2BA/8PAX', bedrooms: 4, baths: 2, guests: 8 },
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchEstimate(combo: Combo): Promise<EstimateResponse> {
  const url = `${BASE_URL}/calculator/estimate?lat=${LAT}&lng=${LNG}&bedrooms=${combo.bedrooms}&baths=${combo.baths}&guests=${combo.guests}`
  const res = await fetch(url, {
    headers: { 'X-API-KEY': AIRROI_API_KEY! },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  return res.json() as Promise<EstimateResponse>
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: decimals })
}

function pct(n: number) {
  return (n * 100).toFixed(1) + '%'
}

async function main() {
  console.log('='.repeat(72))
  console.log('AirROI bedrooms/baths/guests 파라미터 변별력 검증')
  console.log(`좌표: 서교동 centroid (lat=${LAT}, lng=${LNG})`)
  console.log(`API 호출 6회 (간격 500ms) — 실제 과금 발생`)
  console.log('='.repeat(72))

  interface Result {
    combo: Combo
    revenue: number
    adr: number
    occupancy: number
    adrP25: number
    adrP75: number
    occP25: number
    occP75: number
  }

  const results: Result[] = []

  for (let i = 0; i < COMBOS.length; i++) {
    const combo = COMBOS[i]
    process.stdout.write(`[${i + 1}/6] ${combo.label} ... `)
    try {
      const data = await fetchEstimate(combo)
      results.push({
        combo,
        revenue: data.revenue / 12,         // 연간 → 월간 환산
        adr: data.average_daily_rate,
        occupancy: data.occupancy,
        adrP25: data.percentiles.average_daily_rate.p25,
        adrP75: data.percentiles.average_daily_rate.p75,
        occP25: data.percentiles.occupancy.p25,
        occP75: data.percentiles.occupancy.p75,
      })
      console.log(`✅ ADR=${fmt(data.average_daily_rate)} occupancy=${pct(data.occupancy)}`)
    } catch (err) {
      console.log(`❌ 오류: ${err}`)
      results.push({
        combo,
        revenue: NaN, adr: NaN, occupancy: NaN,
        adrP25: NaN, adrP75: NaN, occP25: NaN, occP75: NaN,
      })
    }
    if (i < COMBOS.length - 1) await sleep(500)
  }

  console.log()
  console.log('─'.repeat(72))
  console.log('결과 요약 (currency: 각 응답 통화 기준)')
  console.log('─'.repeat(72))

  // 헤더
  const COL = [22, 10, 10, 10, 20, 20]
  const header = [
    '스펙'.padEnd(COL[0]),
    'ADR'.padStart(COL[1]),
    'Occ%'.padStart(COL[2]),
    '월수익'.padStart(COL[3]),
    'ADR P25~P75'.padStart(COL[4]),
    'Occ P25~P75'.padStart(COL[5]),
  ]
  console.log(header.join(' '))
  console.log('─'.repeat(72))

  for (const r of results) {
    if (isNaN(r.adr)) {
      console.log(r.combo.label.padEnd(COL[0]) + '  오류')
      continue
    }
    const row = [
      r.combo.label.padEnd(COL[0]),
      fmt(r.adr).padStart(COL[1]),
      pct(r.occupancy).padStart(COL[2]),
      fmt(r.revenue).padStart(COL[3]),
      `${fmt(r.adrP25)}~${fmt(r.adrP75)}`.padStart(COL[4]),
      `${pct(r.occP25)}~${pct(r.occP75)}`.padStart(COL[5]),
    ]
    console.log(row.join(' '))
  }

  // 변별력 통계
  const validAdrs = results.map((r) => r.adr).filter((v) => !isNaN(v))
  const validOccs = results.map((r) => r.occupancy).filter((v) => !isNaN(v))

  if (validAdrs.length > 1) {
    const adrMin = Math.min(...validAdrs)
    const adrMax = Math.max(...validAdrs)
    const occMin = Math.min(...validOccs)
    const occMax = Math.max(...validOccs)

    const adrMean = validAdrs.reduce((a, b) => a + b, 0) / validAdrs.length
    const adrStd = Math.sqrt(
      validAdrs.reduce((sum, v) => sum + (v - adrMean) ** 2, 0) / validAdrs.length,
    )
    const occMean = validOccs.reduce((a, b) => a + b, 0) / validOccs.length
    const occStd = Math.sqrt(
      validOccs.reduce((sum, v) => sum + (v - occMean) ** 2, 0) / validOccs.length,
    )

    console.log()
    console.log('─'.repeat(72))
    console.log('변별력 통계')
    console.log('─'.repeat(72))
    console.log(`ADR  — 최솟값: ${fmt(adrMin)}  최댓값: ${fmt(adrMax)}  범위: ${fmt(adrMax - adrMin)}  표준편차: ${fmt(adrStd, 0)}`)
    console.log(`Occ  — 최솟값: ${pct(occMin)}  최댓값: ${pct(occMax)}  범위: ${pct(occMax - occMin)}  표준편차: ${(occStd * 100).toFixed(1)}pp`)
    console.log()
    console.log('판독 기준:')
    console.log('  ADR 범위 < 5,000원  →  파라미터 변별력 없음 (광역 스무딩 의심)')
    console.log('  ADR 범위 ≥ 20,000원 →  파라미터가 의미 있게 분화됨')
    console.log('  Occ 범위 < 3pp      →  파라미터 변별력 없음')
    console.log('  Occ 범위 ≥ 10pp     →  파라미터가 의미 있게 분화됨')
  }

  console.log()
  console.log('='.repeat(72))
  console.log('완료. 이 스크립트는 진단 후 삭제해도 됩니다.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
