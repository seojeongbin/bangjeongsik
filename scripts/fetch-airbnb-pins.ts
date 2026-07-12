/**
 * Phase 2-2C — 에어비앤비 매물 핀 사전 적재 (마포구, 폴리곤 검색)
 *
 * 실행: npm run fetch:airbnb-pins  (수동 갱신 — minbak_listings와 동일 패턴)
 * 선행: 20260709000001_airbnb_pins.sql 마이그레이션 실행 필요
 *
 * ★ 비용 구조 (2026-07-12 실측 확정):
 *   AirROI /listings/search/*는 호출당 $0.50, page_size 최대 10 (하드캡).
 *   → 비용 = ceil(매물수 ÷ 10) × $0.50. 마포 전역 8,812건 기준 약 $441.
 *
 * 실행 모드:
 *   --count-only        API 호출 정확히 1회($0.50)만 하고 total_count·필요 페이지·
 *                       예상 비용을 출력 후 종료. upsert·stale 정리 전부 스킵. (비용 견적용)
 *   (플래그 없음)        --count-only와 동일하게 1회 호출로 견적만 출력하고 중단(종료 코드 1).
 *                       실제 적재는 --yes로 명시 승인해야만 시작됨 — 비용 확인 게이트.
 *   --yes               견적 출력 후 실제 적재 진행.
 *   --dong=서교동        해당 동의 폴리곤만 검색 (전역 대신 부분 적재·테스트용).
 *                       stale 정리도 해당 동으로 한정.
 *   --limit=N           페이지(=호출) 수 상한. 기본 100페이지 = 최대 $50.
 *                       상한 초과가 예상되면 "부분 수집" 경고 후 종료 코드 2.
 *   --resume            중단된 실행을 진행 상태 파일(offset)에서 이어서 재개.
 *
 * 파이프라인:
 *   AirROI POST /listings/search/polygon (동 폴리곤 또는 마포구 병합 폴리곤)
 *   → 동 경계 point-in-polygon으로 16개 동 판정 (구 외 매물 폐기 — 폴리곤 검색이라 거의 없음)
 *   → listing_id는 sha256 해시(익명 키)로만 보관 → 페이지 단위 airbnb_pins upsert
 *   → 전량 수집 완료 시에만 stale 정리 (부분 수집 시 기존 데이터 보존)
 *
 * ★ 화이트리스트 원칙 (법적 제약 — 절대 준수): 좌표·동·침실수·room_type·exact_location만
 *   저장. 숙소명·사진·호스트명·개별 수익 등 응답의 다른 필드는 어떤 형태로도 저장하지 않는다.
 */

import { createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// .env.local 수동 파싱 (dotenv 의존성 없이)
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const AIRROI_API_KEY = process.env.AIRROI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AIRROI_API_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / AIRROI_API_KEY 누락')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── 동 경계 (point-in-polygon + 검색 폴리곤 소스) ────────────────────────────

interface DongBoundaryFeature {
  properties: { dong_nm: string; adm_cd: string }
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

const dongBoundaries = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seoul-mapo-dong-boundaries.json'), 'utf-8')
) as { features: DongBoundaryFeature[] }

// ray casting — ring은 GeoJSON [lng, lat] 순서
function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// MultiPolygon: polygon[0]=외곽 ring, polygon[1..]=hole
function findDong(lat: number, lng: number): string | null {
  for (const feature of dongBoundaries.features) {
    for (const polygon of feature.geometry.coordinates) {
      if (!inRing(lng, lat, polygon[0])) continue
      const inHole = polygon.slice(1).some((hole) => inRing(lng, lat, hole))
      if (!inHole) return feature.properties.dong_nm
    }
  }
  return null
}

// ─── 마포구 병합 폴리곤 (16개 동 dissolve) ────────────────────────────────────
// 인접 동이 공유하는 변(edge)은 전체 링 집합에서 정확히 2번 등장 → 소거하면
// 1번만 등장한 변들이 구 외곽 경계. admdongkor(SGIS) 데이터는 위상이 정확해
// 공유 정점 좌표가 완전히 일치함 — 2026-07-12 오프라인 검증: 단일 링 151정점,
// 병합 면적 = 동 면적 합(shoelace) 일치, 16개 동 중심 모두 내부 확인.

function ringArea(ring: number[][]): number {
  let s = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(s / 2)
}

function buildMapoUnionRing(): number[][] {
  const ptKey = (p: number[]) => `${p[0]},${p[1]}`
  const edgeKey = (a: number[], b: number[]) =>
    ptKey(a) < ptKey(b) ? `${ptKey(a)}|${ptKey(b)}` : `${ptKey(b)}|${ptKey(a)}`

  const edgeCount = new Map<string, number>()
  const edgePoints = new Map<string, [number[], number[]]>()
  let sumDongArea = 0
  for (const f of dongBoundaries.features) {
    for (const poly of f.geometry.coordinates) {
      sumDongArea += ringArea(poly[0])
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i]
          const b = ring[i + 1]
          if (ptKey(a) === ptKey(b)) continue
          const ek = edgeKey(a, b)
          edgeCount.set(ek, (edgeCount.get(ek) ?? 0) + 1)
          edgePoints.set(ek, [a, b])
        }
      }
    }
  }

  // 외곽 변만 남기고 vertex 인접 맵 구성
  const adj = new Map<string, number[][]>()
  for (const [ek, count] of edgeCount) {
    if (count !== 1) continue
    const [a, b] = edgePoints.get(ek)!
    if (!adj.has(ptKey(a))) adj.set(ptKey(a), [])
    if (!adj.has(ptKey(b))) adj.set(ptKey(b), [])
    adj.get(ptKey(a))!.push(b)
    adj.get(ptKey(b))!.push(a)
  }
  for (const [k, neighbors] of adj) {
    if (neighbors.length !== 2) {
      throw new Error(`폴리곤 병합 실패: 외곽 vertex ${k}의 연결 수가 2가 아님(${neighbors.length}) — 경계 데이터 위상 확인 필요`)
    }
  }

  // 스티칭 — 단일 링이어야 함
  const visited = new Set<string>()
  const rings: number[][][] = []
  for (const [startKey] of adj) {
    if (visited.has(startKey)) continue
    const ring: number[][] = []
    let curKey = startKey
    let prevKey: string | null = null
    for (;;) {
      visited.add(curKey)
      const [lng, lat] = curKey.split(',').map(Number)
      ring.push([lng, lat])
      const nexts = adj.get(curKey)!.map(ptKey).filter((k) => k !== prevKey)
      const next = nexts.find((k) => !visited.has(k))
      if (!next) break
      prevKey = curKey
      curKey = next
    }
    rings.push(ring)
  }
  if (rings.length !== 1) {
    throw new Error(`폴리곤 병합 실패: 링이 ${rings.length}개 생성됨(1개여야 함) — 경계 데이터 위상 확인 필요`)
  }
  const union = rings[0]

  // 면적 검증 — 병합 링 면적이 동 면적 합과 일치해야 함 (스티칭 오류 감지)
  const diff = Math.abs(ringArea(union) - sumDongArea) / sumDongArea
  if (diff > 1e-9) {
    throw new Error(`폴리곤 병합 실패: 면적 불일치 (상대오차 ${diff}) — 스티칭 결과 검증 실패`)
  }
  return union
}

// ─── AirROI /listings/search/polygon ─────────────────────────────────────────

// 공식 문서 확정 스펙 (2026-07-12 확인):
//   요청: { polygon: [{latitude, longitude}, ...](3~1000개, 닫힌 링), filter, pagination: {page_size, offset}, currency }
//   응답: 최상위 { pagination: { total_count, page_size, offset }, results: [...] }
const PAGE_SIZE = 10 // AirROI 하드캡: page_size 최대 10 (422: "must be less than or equal to 10")
const COST_PER_CALL_USD = 0.5 // 호출당 과금 — 비용 = 페이지 수 × $0.50
const DEFAULT_MAX_PAGES = 100 // 폭주 방지: 기본 상한 100페이지 = 최대 $50. --limit=N으로 조정
const STATE_FILE = join(__dirname, '.fetch-airbnb-pins.state.json') // 재개(resume)용 진행 상태

// ─── CLI 옵션 ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const opts: { dong?: string; limit?: number; countOnly?: boolean; yes?: boolean; resume?: boolean } = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--dong=')) {
      opts.dong = arg.slice('--dong='.length).trim()
    } else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length))
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n)
    } else if (arg === '--count-only') {
      opts.countOnly = true
    } else if (arg === '--yes') {
      opts.yes = true
    } else if (arg === '--resume') {
      opts.resume = true
    } else {
      console.error(`❌ 알 수 없는 옵션: ${arg}`)
      process.exit(1)
    }
  }
  return opts
}

const cliOpts = parseArgs()

let targetDong: string | null = null
if (cliOpts.dong) {
  const match = dongBoundaries.features.find((f) => f.properties.dong_nm === cliOpts.dong)
  if (!match) {
    console.error(
      `❌ --dong="${cliOpts.dong}" 을 찾을 수 없습니다. 사용 가능한 동: ${dongBoundaries.features.map((f) => f.properties.dong_nm).join(', ')}`,
    )
    process.exit(1)
  }
  targetDong = match.properties.dong_nm
}

const MAX_PAGES = cliOpts.limit ?? DEFAULT_MAX_PAGES
const TARGET_LABEL = targetDong ?? '마포구 전체'

// 검색 폴리곤: --dong이면 해당 동 외곽 링, 아니면 16개 동 병합 링
function buildSearchPolygon(): { latitude: number; longitude: number }[] {
  const ring = targetDong
    ? dongBoundaries.features.find((f) => f.properties.dong_nm === targetDong)!.geometry.coordinates[0][0]
    : buildMapoUnionRing()
  const pts = ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
  // AirROI 스펙: 닫힌 링(첫 점 = 끝 점), 최대 1000개
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (first.latitude !== last.latitude || first.longitude !== last.longitude) pts.push({ ...first })
  if (pts.length > 1000) {
    throw new Error(`폴리곤 정점 ${pts.length}개 — AirROI 상한 1000개 초과. 단순화 필요`)
  }
  return pts
}

// ─── AirROI 호출 ──────────────────────────────────────────────────────────────

interface AirroiListing {
  listing_info?: {
    listing_id?: number | string
    room_type?: string | null
  }
  location_info?: {
    latitude?: number
    longitude?: number
    exact_location?: boolean | null
  }
  property_details?: {
    bedrooms?: number | null
  }
}

function extractListings(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>
    for (const key of ['listings', 'results', 'data', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[]
    }
  }
  return null
}

// total_count는 응답 최상위의 pagination 객체 안에 있음 (2026-07-12 실측·문서 확정)
function extractTotalCount(json: unknown): number | null {
  if (json && typeof json === 'object') {
    const pagination = (json as Record<string, unknown>)['pagination']
    if (pagination && typeof pagination === 'object') {
      const v = (pagination as Record<string, unknown>)['total_count']
      if (typeof v === 'number') return v
    }
  }
  return null
}

interface PageResult {
  listings: unknown[]
  totalCount: number | null
}

async function fetchPage(polygon: { latitude: number; longitude: number }[], offset: number): Promise<PageResult> {
  const res = await fetch('https://api.airroi.com/listings/search/polygon', {
    method: 'POST',
    headers: { 'X-API-KEY': AIRROI_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      polygon,
      filter: {},
      pagination: { page_size: PAGE_SIZE, offset },
      currency: 'native',
    }),
  })

  // 비용 모니터링 — 실호출 기록 (일일 상한 집계에도 포함됨)
  await supabase.from('airroi_usage').insert({
    endpoint: '/listings/search/polygon',
    cache_hit: false,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`)
  }

  const json = await res.json()
  const listings = extractListings(json)
  if (listings === null) {
    const keys = json && typeof json === 'object' ? Object.keys(json as object).join(', ') : typeof json
    throw new Error(`응답에서 listings 배열을 찾지 못함 — 최상위 키: [${keys}]. 응답 구조 확인 필요.`)
  }
  return { listings, totalCount: extractTotalCount(json) }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── 재개(resume) 상태 ────────────────────────────────────────────────────────

interface RunState {
  target: string // 동 이름 또는 '마포구 전체' — 다른 대상의 상태로 재개하는 실수 방지
  fetchedAt: string // 실행 시작일 — 재개해도 같은 기준일 유지 (stale 정리 일관성)
  nextOffset: number // 다음에 요청할 offset (이 앞까지는 upsert 완료)
  totalCount: number
  updatedAt: string
}

function loadState(): RunState | null {
  if (!existsSync(STATE_FILE)) return null
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as RunState
  } catch {
    return null
  }
}

function saveState(state: RunState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function clearState() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE)
}

// ─── main ─────────────────────────────────────────────────────────────────────

interface PinRow {
  listing_key: string
  lat: number
  lng: number
  dong: string
  bedrooms: number | null
  room_type: string | null
  exact_location: boolean
  fetched_at: string
}

// 화이트리스트 필드만 추출 + 동 판정. seen에 있는 listing_key(이미 upsert됨)는 건너뜀.
function toRows(
  listings: unknown[],
  fetchedAt: string,
  seen: Set<string>,
  counters: { noCoords: number; outside: number; wrongDong: number; dup: number },
): PinRow[] {
  const out: PinRow[] = []
  for (const item of listings) {
    const l = item as Partial<AirroiListing>
    const listingId = l.listing_info?.listing_id
    const lat = l.location_info?.latitude
    const lng = l.location_info?.longitude
    if (listingId == null || typeof lat !== 'number' || typeof lng !== 'number') {
      counters.noCoords++
      continue
    }
    const dong = findDong(lat, lng)
    if (!dong) {
      counters.outside++
      continue
    }
    if (targetDong && dong !== targetDong) {
      counters.wrongDong++
      continue
    }
    const listingKey = createHash('sha256').update(String(listingId)).digest('hex')
    if (seen.has(listingKey)) {
      counters.dup++
      continue
    }
    seen.add(listingKey)
    const bedrooms = l.property_details?.bedrooms
    const roomType = l.listing_info?.room_type
    out.push({
      listing_key: listingKey,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      dong,
      bedrooms: typeof bedrooms === 'number' ? bedrooms : null,
      room_type: typeof roomType === 'string' ? roomType : null,
      exact_location: l.location_info?.exact_location === true,
      fetched_at: fetchedAt,
    })
  }
  return out
}

const fmtUsd = (n: number) => `$${n.toFixed(2)}`

async function main() {
  // 0. 재개 상태 확인
  const prevState = loadState()
  let fetchedAt = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  let startOffset = 0

  if (cliOpts.resume) {
    if (!prevState) {
      console.error(`❌ --resume 지정됐지만 진행 상태 파일이 없습니다: ${STATE_FILE}`)
      process.exit(1)
    }
    if (prevState.target !== TARGET_LABEL) {
      console.error(
        `❌ 진행 상태의 대상(${prevState.target})과 이번 실행 대상(${TARGET_LABEL})이 다릅니다.\n` +
          `   같은 대상으로 재개하거나, 처음부터 다시 하려면 상태 파일을 삭제하세요: ${STATE_FILE}`,
      )
      process.exit(1)
    }
    fetchedAt = prevState.fetchedAt // 기준일 유지 — stale 정리가 이번 런 전체를 한 덩어리로 취급
    startOffset = prevState.nextOffset
  } else if (prevState && !cliOpts.countOnly) {
    console.error(
      `❌ 미완료 실행의 진행 상태 파일이 있습니다 (대상: ${prevState.target}, offset ${prevState.nextOffset}/${prevState.totalCount}).\n` +
        `   이어서: --resume 추가 / 처음부터: 상태 파일 삭제 후 재실행 (${STATE_FILE})\n` +
        `   ※ 처음부터 다시 돌면 이미 수집한 ${prevState.nextOffset}건 몫의 호출 비용이 중복 발생합니다.`,
    )
    process.exit(1)
  }

  // 1. 검색 폴리곤 구성 (API 호출 전 — 실패 시 과금 없음)
  const polygon = buildSearchPolygon()

  console.log('='.repeat(64))
  console.log('에어비앤비 매물 핀 적재 (Phase 2-2C) — 폴리곤 검색')
  console.log(`대상: ${TARGET_LABEL} (폴리곤 ${polygon.length}정점) · 페이지 상한 ${MAX_PAGES} (최대 ${fmtUsd(MAX_PAGES * COST_PER_CALL_USD)})`)
  if (cliOpts.countOnly) console.log('모드: --count-only (호출 1회, 견적만)')
  if (cliOpts.resume) console.log(`모드: --resume (offset ${startOffset}부터 재개, 기준일 ${fetchedAt} 유지)`)
  console.log('='.repeat(64))

  // 2. 첫 페이지 호출 — total_count 확보 (count-only든 실제 적재든 이 1회는 필요)
  process.stdout.write(`[호출 1] offset=${startOffset} ... `)
  const firstPage = await fetchPage(polygon, startOffset)
  console.log(`${firstPage.listings.length}건`)

  if (firstPage.totalCount === null) {
    console.error('❌ 응답 pagination.total_count를 읽지 못했습니다 — 비용 견적 불가. 응답 구조 확인 필요. 중단합니다.')
    process.exit(1)
  }
  const totalCount = firstPage.totalCount
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const remainingPages = Math.max(1, totalPages - Math.floor(startOffset / PAGE_SIZE)) // 방금 쓴 1회 포함

  console.log('')
  console.log('─'.repeat(64))
  console.log(`전체 매물 수(total_count): ${totalCount.toLocaleString()}건`)
  console.log(`전량 수집 필요 페이지: ${totalPages}페이지 (page_size ${PAGE_SIZE})`)
  if (startOffset > 0) console.log(`재개 후 남은 페이지: ${remainingPages}페이지`)
  console.log(`예상 비용: ${fmtUsd(remainingPages * COST_PER_CALL_USD)} (호출당 ${fmtUsd(COST_PER_CALL_USD)})`)
  console.log('─'.repeat(64))

  // 3-a. count-only — 여기서 종료 (upsert·stale 정리 없음)
  if (cliOpts.countOnly) {
    console.log('\n--count-only 모드 — 호출 1회로 종료. 적재하려면 --yes로 재실행하세요.')
    process.exit(0)
  }

  // 3-b. 비용 확인 게이트 — --yes 없으면 여기서 중단 (승인 없이 대량 과금 방지)
  if (!cliOpts.yes) {
    console.error(
      '\n⛔ 비용 확인 게이트: --yes 플래그가 없어 적재를 시작하지 않습니다.\n' +
        `   위 예상 비용(${fmtUsd(remainingPages * COST_PER_CALL_USD)})을 확인했으면 --yes를 붙여 재실행하세요.`,
    )
    process.exit(1)
  }

  // 3-c. 상한 검사 — 전량 수집 불가면 시작 전에 크게 경고
  const willTruncate = remainingPages > MAX_PAGES
  if (willTruncate) {
    console.warn('\n' + '⚠'.repeat(32))
    console.warn(`⚠️ 부분 수집 경고: 페이지 상한 ${MAX_PAGES} < 필요 ${remainingPages}페이지`)
    console.warn(`⚠️ 이번 실행은 최대 ${(MAX_PAGES * PAGE_SIZE).toLocaleString()}건까지만 수집합니다 (전체 ${totalCount.toLocaleString()}건).`)
    console.warn(`⚠️ 전량 수집하려면 --limit=${remainingPages} 로 상한을 올리세요 (비용 ${fmtUsd(remainingPages * COST_PER_CALL_USD)}).`)
    console.warn(`⚠️ 부분 수집으로 끝나면 stale 정리를 건너뛰고 종료 코드 2로 끝납니다.`)
    console.warn('⚠'.repeat(32) + '\n')
  }

  // 4. 페이지네이션 수집 — 페이지 단위 upsert + 진행 상태 저장 (중단 시 --resume 재개)
  const seen = new Set<string>()
  const counters = { noCoords: 0, outside: 0, wrongDong: 0, dup: 0 }
  const byDong: Record<string, number> = {}
  let upserted = 0
  let pagesUsed = 0
  let offset = startOffset
  let complete = false
  let page = firstPage

  for (;;) {
    pagesUsed++
    if (pagesUsed > 1) {
      process.stdout.write(`[호출 ${pagesUsed}] offset=${offset} ... `)
      page = await fetchPage(polygon, offset)
      console.log(`${page.listings.length}건`)
    }

    const rows = toRows(page.listings, fetchedAt, seen, counters)
    if (rows.length > 0) {
      const { error } = await supabase.from('airbnb_pins').upsert(rows, { onConflict: 'listing_key' })
      if (error) {
        console.error(`❌ upsert 실패 (offset ${offset}): ${error.message}`)
        console.error(`   진행 상태는 저장돼 있어 --resume으로 재개 가능합니다.`)
        process.exit(1)
      }
      upserted += rows.length
      for (const r of rows) byDong[r.dong] = (byDong[r.dong] ?? 0) + 1
    }

    offset += PAGE_SIZE
    saveState({ target: TARGET_LABEL, fetchedAt, nextOffset: offset, totalCount, updatedAt: new Date().toISOString() })

    if (offset >= totalCount || page.listings.length < PAGE_SIZE) {
      complete = true
      break
    }
    if (pagesUsed >= MAX_PAGES) break // 부분 수집 — 상태 파일 유지 (--resume으로 이어서)
    await sleep(300)
  }

  // 5. 결과 요약
  console.log(
    `\n수집: ${upserted}건 upsert (좌표 누락 ${counters.noCoords} / 구 외 ${counters.outside}${
      targetDong ? ` / ${targetDong} 외 ${counters.wrongDong}` : ''
    } / 중복 ${counters.dup} 제외) · 호출 ${pagesUsed}회 = ${fmtUsd(pagesUsed * COST_PER_CALL_USD)}`,
  )
  console.log('\n동별 분포 (이번 세션):')
  for (const [dong, n] of Object.entries(byDong).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dong}: ${n}건`)
  }

  if (!complete) {
    console.error('\n' + '⚠'.repeat(32))
    console.error(`⚠️ 부분 수집으로 종료 — ${offset}/${totalCount}건 지점까지만 수집됨.`)
    console.error(`⚠️ stale 정리를 건너뛰었습니다 (기존 데이터 보존). 이어서: --resume --limit=${totalPages} --yes`)
    console.error('⚠'.repeat(32))
    process.exit(2) // 종료 코드 2 = 부분 수집 (완료 아님)
  }

  // 6. stale 정리 — 전량 수집 완료 시에만. 이번 기준일과 다른 모든 행 제거
  //    (이전의 절단된 부분 적재분 — 예: 반경 검색 시절 서교동 423건 — 도 여기서 교체됨)
  //    --dong 모드는 해당 동으로만 한정 — 다른 동의 기존 적재분 보호
  if (upserted === 0) {
    console.error('❌ 적재된 매물이 0건 — 기존 데이터를 보존하고 종료합니다.')
    process.exit(1)
  }
  let staleQuery = supabase.from('airbnb_pins').delete({ count: 'exact' }).neq('fetched_at', fetchedAt)
  if (targetDong) staleQuery = staleQuery.eq('dong', targetDong)
  const { error: delError, count } = await staleQuery
  if (delError) {
    console.error(`⚠️ stale 정리 실패 (데이터는 적재됨): ${delError.message}`)
  } else {
    console.log(`\nstale 정리: ${count ?? 0}건 삭제 (${TARGET_LABEL}, 기준일 ${fetchedAt} 외 전부)`)
  }

  clearState() // 완주 — 진행 상태 파일 제거
  console.log(`\n=== 완료 (전량 수집) === 기준일: ${fetchedAt} · 총 ${totalCount.toLocaleString()}건 중 ${upserted}건 적재`)
}

main().catch((err) => {
  console.error('❌', err)
  console.error('진행 상태 파일이 있으면 --resume으로 이어서 실행할 수 있습니다.')
  process.exit(1)
})
