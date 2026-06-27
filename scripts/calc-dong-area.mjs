import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 마포구 평균 위도 기준 경도 1도 → 미터 환산
const LAT_DEGREE_M = 111320
const MAPO_AVG_LAT_RAD = 37.55 * (Math.PI / 180)
const LNG_DEGREE_M = 111320 * Math.cos(MAPO_AVG_LAT_RAD)

// Shoelace formula: 미터 단위 좌표 ring의 면적(m²) 절댓값
function ringAreaM2(ring) {
  let area = 0
  const n = ring.length
  for (let i = 0; i < n; i++) {
    const [lng0, lat0] = ring[i]
    const [lng1, lat1] = ring[(i + 1) % n]
    const x0 = lng0 * LNG_DEGREE_M
    const y0 = lat0 * LAT_DEGREE_M
    const x1 = lng1 * LNG_DEGREE_M
    const y1 = lat1 * LAT_DEGREE_M
    area += x0 * y1 - x1 * y0
  }
  return Math.abs(area / 2)
}

const raw = readFileSync(join(ROOT, 'data', 'seoul-mapo-dong-boundaries.json'), 'utf-8')
const geojson = JSON.parse(raw)

const results = geojson.features.map((f) => {
  const { dong_nm, adm_cd } = f.properties
  // MultiPolygon: 첫 polygon의 외곽 ring만 사용 (D-1과 동일 방식)
  const ring = f.geometry.coordinates[0][0]
  const area_sqkm = ringAreaM2(ring) / 1_000_000
  return {
    dong_nm,
    adm_cd,
    area_sqkm: Math.round(area_sqkm * 1000) / 1000,
  }
})

// 검증: 마포구 전체 면적 ≈ 23.85㎢
const totalArea = results.reduce((s, r) => s + r.area_sqkm, 0)
const MAPO_ACTUAL_SQM = 23.85
const diffPct = Math.abs((totalArea - MAPO_ACTUAL_SQM) / MAPO_ACTUAL_SQM) * 100
console.log('=== 면적 계산 결과 ===')
results.forEach((r) => console.log(`  ${r.dong_nm}: ${r.area_sqkm} ㎢`))
console.log(`\n합산 면적: ${totalArea.toFixed(3)} ㎢  (마포구 실제: ${MAPO_ACTUAL_SQM} ㎢)`)
console.log(
  diffPct <= 10
    ? `✅ 오차 ${diffPct.toFixed(1)}% — 정상 범위 (10% 이내)`
    : `⚠️  오차 ${diffPct.toFixed(1)}% — 10% 초과, 확인 필요`
)

const outPath = join(ROOT, 'data', 'seoul-mapo-dong-area.json')
writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8')
console.log(`\n저장 완료: ${outPath}`)
