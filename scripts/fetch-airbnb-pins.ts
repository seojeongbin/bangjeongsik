/**
 * Phase 2-2C — 에어비앤비 매물 핀 사전 적재 (마포구)
 *
 * 실행: npm run fetch:airbnb-pins  (수동 갱신 — minbak_listings와 동일 패턴)
 * 선행: 20260709000001_airbnb_pins.sql 마이그레이션 실행 필요
 *
 * 파이프라인:
 *   AirROI POST /listings/search/radius (마포 중심, 반경 5마일, 페이지네이션)
 *   → 동 경계 폴리곤 point-in-polygon으로 마포구 16개 동 판정 (구 외 매물 폐기)
 *   → listing_id는 sha256 해시(익명 키)로만 보관 → airbnb_pins upsert
 *   → 이번 실행일 이전 행 삭제 (stale 정리)
 *
 * ★ 화이트리스트 원칙: 좌표·동·침실수·room_type·exact_location만 저장.
 *   숙소명·사진·개별 수익 등 응답의 다른 필드는 어떤 형태로도 저장하지 않는다.
 *
 * 비용: AirROI 실호출 (페이지당 1회, 과금 발생) — airroi_usage에 기록됨.
 */

import { createHash } from 'crypto'
import { readFileSync } from 'fs'
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

// ─── 동 경계 (point-in-polygon) ───────────────────────────────────────────────

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

// ─── AirROI /listings/search/radius ───────────────────────────────────────────

// 마포구 전역 커버: 중심(37.556, 126.921)에서 서쪽 끝(상암동)까지 약 4마일 → 5마일
const MAPO_CENTER = { lat: 37.556, lng: 126.921 }
const RADIUS_MILES = 5
const PAGE_SIZE = 100
const MAX_PAGES = 100 // 폭주 방지 (100페이지 = 최대 10,000건)

interface AirroiListing {
  listing_id: number | string
  latitude: number
  longitude: number
  bedrooms?: number | null
  room_type?: string | null
  exact_location?: boolean | null
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

async function fetchPage(offset: number): Promise<unknown[]> {
  const res = await fetch('https://api.airroi.com/listings/search/radius', {
    method: 'POST',
    headers: { 'X-API-KEY': AIRROI_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: MAPO_CENTER.lat,
      longitude: MAPO_CENTER.lng,
      radius_miles: RADIUS_MILES,
      filter: {},
      pagination: { page_size: PAGE_SIZE, offset },
      currency: 'native',
    }),
  })

  // 비용 모니터링 — 실호출 기록 (일일 상한 집계에도 포함됨)
  await supabase.from('airroi_usage').insert({
    endpoint: '/listings/search/radius',
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
  return listings
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function main() {
  const fetchedAt = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  console.log('='.repeat(64))
  console.log('에어비앤비 매물 핀 적재 (Phase 2-2C)')
  console.log(`중심: (${MAPO_CENTER.lat}, ${MAPO_CENTER.lng}) 반경 ${RADIUS_MILES}마일 — AirROI 실호출 과금 발생`)
  console.log('='.repeat(64))

  // 1. 페이지네이션 수집
  const raw: unknown[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    process.stdout.write(`[page ${page + 1}] offset=${offset} ... `)
    const listings = await fetchPage(offset)
    console.log(`${listings.length}건`)
    raw.push(...listings)
    if (listings.length < PAGE_SIZE) break
    await sleep(300)
  }
  console.log(`\n수집 합계: ${raw.length}건`)

  // 2. 필드 추출 + 동 판정 (마포구 외 폐기) — 화이트리스트 필드만 사용
  const rows = new Map<string, PinRow>()
  let skippedNoCoords = 0
  let skippedOutside = 0

  for (const item of raw) {
    const l = item as Partial<AirroiListing>
    if (l.listing_id == null || typeof l.latitude !== 'number' || typeof l.longitude !== 'number') {
      skippedNoCoords++
      continue
    }
    const dong = findDong(l.latitude, l.longitude)
    if (!dong) {
      skippedOutside++
      continue
    }
    const listingKey = createHash('sha256').update(String(l.listing_id)).digest('hex')
    rows.set(listingKey, {
      listing_key: listingKey,
      lat: Number(l.latitude.toFixed(6)),
      lng: Number(l.longitude.toFixed(6)),
      dong,
      bedrooms: typeof l.bedrooms === 'number' ? l.bedrooms : null,
      room_type: typeof l.room_type === 'string' ? l.room_type : null,
      exact_location: l.exact_location === true,
      fetched_at: fetchedAt,
    })
  }

  console.log(`마포구 내 매물: ${rows.size}건 (좌표 누락 ${skippedNoCoords}건 / 구 외 ${skippedOutside}건 제외)`)

  if (rows.size === 0) {
    console.error('❌ 적재할 매물이 0건 — 기존 데이터를 보존하고 종료합니다.')
    process.exit(1)
  }

  // 3. upsert (500건씩)
  const all = [...rows.values()]
  for (let i = 0; i < all.length; i += 500) {
    const chunk = all.slice(i, i + 500)
    const { error } = await supabase
      .from('airbnb_pins')
      .upsert(chunk, { onConflict: 'listing_key' })
    if (error) {
      console.error(`❌ upsert 실패 (${i}~${i + chunk.length}): ${error.message}`)
      process.exit(1)
    }
    console.log(`  upsert ${Math.min(i + 500, all.length)}/${all.length}`)
  }

  // 4. stale 정리 — 이번 실행에 없던 매물(영업 종료 등) 제거
  const { error: delError, count } = await supabase
    .from('airbnb_pins')
    .delete({ count: 'exact' })
    .lt('fetched_at', fetchedAt)
  if (delError) {
    console.error(`⚠️ stale 정리 실패 (데이터는 적재됨): ${delError.message}`)
  } else {
    console.log(`stale 정리: ${count ?? 0}건 삭제`)
  }

  // 동별 분포 출력
  const byDong: Record<string, number> = {}
  for (const r of all) byDong[r.dong] = (byDong[r.dong] ?? 0) + 1
  console.log('\n동별 분포:')
  for (const [dong, n] of Object.entries(byDong).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dong}: ${n}건`)
  }

  console.log(`\n=== 완료 === 기준일: ${fetchedAt}`)
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
