import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

interface DongArea {
  dong_nm: string
  area_sqkm: number
}

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface DongCenter {
  dong_nm: string
  adm_cd: string
  lat: number
  lng: number
}

interface DongMinbakCount {
  dong_nm: string
  count: number | null
  fetched_at: string
}

const centers: DongCenter[] = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seoul-mapo-dong-centers.json'), 'utf-8')
)

const dongAreas: DongArea[] = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seoul-mapo-dong-area.json'), 'utf-8')
)
const areaMap: Record<string, number> = Object.fromEntries(
  dongAreas.map((d) => [d.dong_nm, d.area_sqkm])
)

async function main() {
  const fetchedAt = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const results: DongMinbakCount[] = []

  console.log(`=== 외도민 개수 조회 시작 (${centers.length}개 동, radius=500m) ===\n`)

  for (const dong of centers) {
    const { data, error } = await supabase.rpc('get_nearby_minbak', {
      user_lat: dong.lat,
      user_lng: dong.lng,
      radius_m: 500,
    })

    if (error) {
      console.error(`  ❌ ${dong.dong_nm}: ${error.message}`)
      results.push({ dong_nm: dong.dong_nm, count: null, fetched_at: fetchedAt })
      continue
    }

    const count: number = typeof data === 'number' ? data : (data as { count: number })?.count ?? 0
    console.log(`  ✅ ${dong.dong_nm}: ${count}개`)
    results.push({ dong_nm: dong.dong_nm, count, fetched_at: fetchedAt })
  }

  const outPath = join(ROOT, 'data', 'seoul-mapo-dong-minbak-count.json')
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8')

  // ─── 밀도 임계값 계산 (equal-thirds 분위수) ─────────────────────────────────
  // 유효한 동(count ≠ null, area > 0)만 사용
  const densities = results
    .filter((r) => r.count !== null && areaMap[r.dong_nm] > 0)
    .map((r) => (r.count as number) / areaMap[r.dong_nm])
    .sort((a, b) => a - b)

  const n = densities.length
  const k = Math.floor(n / 3)
  const low_threshold  = Math.round(densities[k]       * 10) / 10  // 하위 1/3 경계
  const high_threshold = Math.round(densities[n - k]   * 10) / 10  // 상위 1/3 경계

  const thresholds = {
    low_threshold,
    high_threshold,
    calculated_at: fetchedAt,
    method: `equal-thirds: k=floor(n/3)=${k}, low=sorted[${k}], high=sorted[${n - k}], n=${n}`,
  }

  const thresholdsPath = join(ROOT, 'data', 'seoul-mapo-dong-density-thresholds.json')
  writeFileSync(thresholdsPath, JSON.stringify(thresholds, null, 2), 'utf-8')

  // 분포 검증 출력 — 프론트엔드와 동일하게 소수점 1자리 반올림 후 비교
  const low = low_threshold, high = high_threshold
  const rounded = densities.map((d) => Math.round(d * 10) / 10)
  const 여유 = rounded.filter((d) => d < low).length
  const 보통 = rounded.filter((d) => d >= low && d < high).length
  const 치열 = rounded.filter((d) => d >= high).length

  console.log(`\n=== 밀도 임계값 ===`)
  console.log(`  low_threshold:  ${low_threshold} 개/㎢  (여유 기준)`)
  console.log(`  high_threshold: ${high_threshold} 개/㎢  (치열 기준)`)
  console.log(`  분포: 여유=${여유}개 / 보통=${보통}개 / 치열=${치열}개`)
  console.log(`저장 완료: ${thresholdsPath}`)

  console.log(`\n=== 완료 ===`)
  console.log(`저장 완료: ${outPath}`)
  console.log(`성공: ${results.filter((r) => r.count !== null).length}개 / 실패: ${results.filter((r) => r.count === null).length}개`)
}

main()
