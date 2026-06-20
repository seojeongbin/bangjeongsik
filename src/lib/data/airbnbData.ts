import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendAlertEmail } from '@/lib/alert'

const AIRROI_BASE_URL = 'https://api.airroi.com'
const DAILY_CALL_LIMIT = 100

// ─── Public interface ────────────────────────────────────────────────────────

export interface AirbnbAreaStats {
  avgRevenue: number    // 월간 환산값 (API 연간 수익 ÷ 12)
  avgOccupancy: number
  avgAdr: number
  revenueP25?: number   // 월간 환산값 (API 연간 p25 ÷ 12)
  revenueP75?: number   // 월간 환산값 (API 연간 p75 ÷ 12)
  dataMonth: string  // 'YYYY-MM' — API 호출 시각 기준
  monthlyDistributions: { month: number; weight: number }[]  // 1=1월 ~ 12=12월, 합계=1.0
  currency: string
  fetchedAt: string  // ISO — 면책문구 기준일 표시용
}

// ─── AirROI response shapes ───────────────────────────────────────────────────

interface LookupResponse {
  district: string | null
  locality: string
  region: string
  country: string
  full_name: string
}

interface PercentileBreakdown {
  avg: number
  p25: number
  p50: number
  p75: number
  p90: number
}

interface EstimateResponse {
  revenue: number
  average_daily_rate: number
  occupancy: number
  percentiles: {
    revenue: PercentileBreakdown
    average_daily_rate: PercentileBreakdown
    occupancy: PercentileBreakdown
  }
  monthly_revenue_distributions: number[]
  currency: string
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

async function notifyDailyLimitExceeded(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  Sentry.captureMessage('AirROI daily call limit exceeded', 'warning')
  void sendAlertEmail(
    'AirROI 일일 호출 상한 초과',
    `AirROI API 일일 호출 상한(${DAILY_CALL_LIMIT}건)을 초과했습니다.\n기준일: ${today}\n\n신규 AirROI 호출이 차단됩니다. 캐시 데이터로만 서비스됩니다.`,
  )
}

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
  const data = await fetchFromAirROI<LookupResponse>(
    `/markets/lookup?lat=${lat}&lng=${lng}`,
  )
  const district = data.district ?? data.locality
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
  } catch (err) {
    console.error('[AirROI]', err)
    Sentry.captureException(err, { tags: { airroi_endpoint: '/markets/lookup' } })
    await logUsage('/markets/lookup', false)
    throw new Error('DATA_UNAVAILABLE')
  }

  // 4. 수익 추정 호출
  let estimate: EstimateResponse
  try {
    estimate = await fetchFromAirROI<EstimateResponse>(
      `/calculator/estimate?lat=${lat}&lng=${lng}&bedrooms=2&baths=1&guests=4`,
    )
  } catch (err) {
    console.error('[AirROI]', err)
    Sentry.captureException(err, { tags: { airroi_endpoint: '/calculator/estimate' } })
    await logUsage('/calculator/estimate', false)
    throw new Error('DATA_UNAVAILABLE')
  }

  // 5. 캐시 저장용 시각 — stats 조립 전에 선언
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  await logUsage('/calculator/estimate', false)

  const stats: AirbnbAreaStats = {
    avgRevenue: estimate.revenue / 12,
    avgOccupancy: estimate.occupancy,
    avgAdr: estimate.average_daily_rate,
    revenueP25: estimate.percentiles.revenue.p25 / 12,
    revenueP75: estimate.percentiles.revenue.p75 / 12,
    dataMonth: now.toISOString().slice(0, 7),
    monthlyDistributions: estimate.monthly_revenue_distributions.map(
      (weight, index) => ({ month: index + 1, weight }),
    ),
    currency: estimate.currency.toLowerCase(),
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
