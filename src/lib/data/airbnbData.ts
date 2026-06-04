import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/server'

const AIRROI_BASE_URL = 'https://api.airroi.com'
const DAILY_CALL_LIMIT = 100

// ─── Public interface ────────────────────────────────────────────────────────

export interface AirbnbAreaStats {
  avgRevenue: number
  avgOccupancy: number
  avgAdr: number
  revenueP25?: number
  revenueP75?: number
  dataMonth: string  // 'YYYY-MM' — 기준 월
  currency: string
  fetchedAt: string  // ISO — 면책문구 기준일 표시용
}

// ─── AirROI response shapes (TODO: verify field names against live API) ──────

interface LookupResponse {
  district?: string
  name?: string
}

interface RevenueResponse {
  average?: number
  avg?: number
  p25?: number
  percentile_25?: number
  p75?: number
  percentile_75?: number
  months?: string[]
}

interface OccupancyResponse {
  average?: number
  avg?: number
}

interface AdrResponse {
  average?: number
  avg?: number
}

// ─── Stub — Step 6에서 구현 예정 ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function notifyDailyLimitExceeded(): Promise<void> {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCoordinate(val: number): number {
  return Number(val.toFixed(4))
}

async function logUsage(endpoint: string, cacheHit: boolean): Promise<void> {
  await supabaseAdmin
    .from('airroi_usage')
    .insert({ endpoint, cache_hit: cacheHit })
}

async function checkDailyLimit(): Promise<boolean> {
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  const { count, error } = await supabaseAdmin
    .from('airroi_usage')
    .select('*', { count: 'exact', head: true })
    .gte('called_at', todayMidnight.toISOString())
    .eq('cache_hit', false)

  if (error) return true // 집계 실패 시 보수적으로 허용
  return (count ?? 0) < DAILY_CALL_LIMIT
}

async function fetchFromAirROI<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.AIRROI_API_KEY
  if (!apiKey) throw new Error('AIRROI_API_KEY_MISSING')

  const res = await fetch(`${AIRROI_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) throw new Error(`AIRROI_HTTP_${res.status}`)
  return res.json() as Promise<T>
}

async function lookupDistrict(lat: number, lng: number): Promise<string> {
  // TODO: verify response field name against /markets/lookup live response
  const data = await fetchFromAirROI<LookupResponse>(
    `/markets/lookup?lat=${lat}&lng=${lng}`,
  )
  const district = data.district ?? data.name
  if (!district) throw new Error('AIRROI_DISTRICT_NOT_FOUND')
  return district
}

// ─── Public function ──────────────────────────────────────────────────────────

export async function getAirbnbData(params: {
  lat: number
  lng: number
  radiusM?: number
}): Promise<AirbnbAreaStats> {
  const lat = normalizeCoordinate(params.lat)
  const lng = normalizeCoordinate(params.lng)
  const radiusM = params.radiusM ?? 1000

  // 1. 캐시 조회 — 유효기간 내 최신 1건
  const { data: cacheRows, error: cacheReadError } = await supabaseAdmin
    .from('airroi_cache')
    .select('data, fetched_at')
    .eq('lat', lat)
    .eq('lng', lng)
    .eq('radius_m', radiusM)
    .gt('expires_at', new Date().toISOString())
    .limit(1)

  if (cacheReadError) throw new Error('DATA_UNAVAILABLE')

  const cached = cacheRows?.[0] ?? null

  if (cached) {
    await logUsage('/markets/*', true)
    return { ...(cached.data as AirbnbAreaStats), fetchedAt: cached.fetched_at as string }
  }

  // 2. 일일 호출 상한 체크
  const withinLimit = await checkDailyLimit()
  if (!withinLimit) {
    await notifyDailyLimitExceeded()
    throw new Error('SERVICE_LIMIT_REACHED')
  }

  // 3. district lookup
  let district: string
  try {
    district = await lookupDistrict(lat, lng)
  } catch {
    await logUsage('/markets/lookup', false)
    throw new Error('DATA_UNAVAILABLE')
  }

  const requestBody = {
    market: { country: 'South Korea', locality: 'Seoul', district },
    currency: 'krw',
    num_months: 12,
  }

  // 4. revenue / occupancy / adr 병렬 호출
  const [revenueResult, occupancyResult, adrResult] = await Promise.allSettled([
    fetchFromAirROI<RevenueResponse>('/markets/revenue', requestBody),
    fetchFromAirROI<OccupancyResponse>('/markets/occupancy', requestBody),
    fetchFromAirROI<AdrResponse>('/markets/adr', requestBody),
  ])

  // 부분 실패도 전체 실패 처리 — 불완전한 리포트 제공 금지
  await logUsage('/markets/*', false)

  if (
    revenueResult.status === 'rejected' ||
    occupancyResult.status === 'rejected' ||
    adrResult.status === 'rejected'
  ) {
    throw new Error('DATA_UNAVAILABLE')
  }

  const revenue = revenueResult.value
  const occupancy = occupancyResult.value
  const adr = adrResult.value

  // 5. 캐시 저장용 시각 — stats 조립 전에 선언
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // TODO: verify field names against live API responses
  const stats: AirbnbAreaStats = {
    avgRevenue: revenue.average ?? revenue.avg ?? 0,
    avgOccupancy: occupancy.average ?? occupancy.avg ?? 0,
    avgAdr: adr.average ?? adr.avg ?? 0,
    revenueP25: revenue.p25 ?? revenue.percentile_25,
    revenueP75: revenue.p75 ?? revenue.percentile_75,
    // TODO: verify months 필드명 — 없으면 호출 시각의 전월 사용
    dataMonth:
      revenue.months?.[0] ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
    currency: 'krw',
    fetchedAt: now.toISOString(),
  }

  await supabaseAdmin.from('airroi_cache').insert({
    lat,
    lng,
    radius_m: radiusM,
    data: stats,
    fetched_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  })

  return stats
}
