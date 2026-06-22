import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

console.log('Reading GeoJSON file...');
const raw = readFileSync(join(ROOT, 'data', 'raw', 'HangJeongDong_ver20260401.geojson'), 'utf-8');

console.log('Parsing JSON...');
const geojson = JSON.parse(raw);

console.log(`Total features: ${geojson.features.length}`);
console.log('Sample properties:', geojson.features[0].properties);

// Filter 마포구
const mapoFeatures = geojson.features.filter(f => f.properties.sggnm === '마포구');
console.log(`\n마포구 features: ${mapoFeatures.length}`);

// ─── Geometry helpers ─────────────────────────────────────────────────────────

// Shoelace formula: signed area of a ring ([lng, lat][] points)
// Returns positive for counter-clockwise, negative for clockwise
function ringArea(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

// Standard polygon centroid formula (shoelace-based) for a single ring
function ringCentroid(ring) {
  let cx = 0, cy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  const a = ringArea(ring);
  return { lng: cx / (6 * a), lat: cy / (6 * a) };
}

// Area-weighted centroid for MultiPolygon geometry
// Uses only the outer ring (index 0) of each polygon — holes excluded
function calcCentroid(geometry) {
  const polygons =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates          // [polygon][ring][point]
      : [geometry.coordinates];       // Polygon → wrap

  let totalArea = 0;
  let wLng = 0, wLat = 0;

  for (const polygon of polygons) {
    const outerRing = polygon[0];
    const area = Math.abs(ringArea(outerRing));
    const { lng, lat } = ringCentroid(outerRing);
    totalArea += area;
    wLng += lng * area;
    wLat += lat * area;
  }

  return { lng: wLng / totalArea, lat: wLat / totalArea };
}

// Ray-casting point-in-polygon (2D, works with [lng, lat] ring)
function pointInRing(lng, lat, ring) {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// Check if point is inside any polygon of a MultiPolygon (outer ring only)
function pointInGeometry(lng, lat, geometry) {
  const polygons =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [geometry.coordinates];
  return polygons.some(polygon => pointInRing(lng, lat, polygon[0]));
}

// ─── Build outputs ────────────────────────────────────────────────────────────

// a) Boundaries GeoJSON — keep only essential properties
const boundariesGeoJSON = {
  type: 'FeatureCollection',
  features: mapoFeatures.map(f => ({
    type: 'Feature',
    properties: {
      dong_nm: f.properties.adm_nm.split(' ').pop(), // "마포구 합정동" → "합정동"
      adm_cd: f.properties.adm_cd,
      adm_cd2: f.properties.adm_cd2,
      sggnm: f.properties.sggnm,
    },
    geometry: f.geometry,
  })),
};

// b) Centers JSON
console.log('\n=== centroid 계산 ===');
const warnings = [];

const centers = mapoFeatures.map(f => {
  const dong_nm = f.properties.adm_nm.split(' ').pop();
  const centroid = calcCentroid(f.geometry);
  const inside = pointInGeometry(centroid.lng, centroid.lat, f.geometry);

  if (!inside) {
    const msg = `⚠️  ${dong_nm}: 면적 가중 centroid가 polygon 외부에 위치 (${centroid.lng.toFixed(5)}, ${centroid.lat.toFixed(5)})`;
    console.warn(msg);
    warnings.push(dong_nm);
  }

  return {
    dong_nm,
    adm_cd: f.properties.adm_cd,
    adm_cd2: f.properties.adm_cd2,
    lat: Math.round(centroid.lat * 1e7) / 1e7,
    lng: Math.round(centroid.lng * 1e7) / 1e7,
  };
});

// ─── Write files ──────────────────────────────────────────────────────────────

mkdirSync(join(ROOT, 'data'), { recursive: true });

const boundariesPath = join(ROOT, 'data', 'seoul-mapo-dong-boundaries.json');
const centersPath = join(ROOT, 'data', 'seoul-mapo-dong-centers.json');

writeFileSync(boundariesPath, JSON.stringify(boundariesGeoJSON), 'utf-8');
writeFileSync(centersPath, JSON.stringify(centers, null, 2), 'utf-8');

// ─── Report ───────────────────────────────────────────────────────────────────

const boundariesSize = Buffer.byteLength(JSON.stringify(boundariesGeoJSON), 'utf-8');
const centersSize = Buffer.byteLength(JSON.stringify(centers, null, 2), 'utf-8');

console.log('\n=== 결과 ===');
console.log(`추출된 마포구 행정동 수: ${mapoFeatures.length}개`);
console.log(`boundaries 파일 크기: ${(boundariesSize / 1024).toFixed(1)} KB`);
console.log(`centers 파일 크기: ${(centersSize / 1024).toFixed(1)} KB`);
if (warnings.length === 0) {
  console.log('✅ 전체 16개 동 centroid가 모두 polygon 내부에 위치');
} else {
  console.log(`⚠️  polygon 외부 centroid 감지된 동 (${warnings.length}개): ${warnings.join(', ')}`);
  console.log('   → 해당 동은 visual center 방식 추가 보정 검토 필요');
}

console.log('\n사용 가능한 properties 필드:');
console.log('  dong_nm  — 행정동 이름 (예: 합정동)');
console.log('  adm_cd   — 행정동 코드 8자리');
console.log('  adm_cd2  — 행정동 코드 10자리');
console.log('  sggnm    — 시군구 이름 (마포구)');
console.log('\ncenter 샘플:');
centers.slice(0, 3).forEach(c => console.log(' ', JSON.stringify(c)));
