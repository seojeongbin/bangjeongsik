import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

console.log('Reading GeoJSON file...');
const raw = readFileSync(join(ROOT, 'HangJeongDong_ver20260401.geojson'), 'utf-8');

console.log('Parsing JSON...');
const geojson = JSON.parse(raw);

console.log(`Total features: ${geojson.features.length}`);
console.log('Sample properties:', geojson.features[0].properties);

// Filter 마포구
const mapoFeatures = geojson.features.filter(f => f.properties.sggnm === '마포구');
console.log(`\n마포구 features: ${mapoFeatures.length}`);

// Helper: flatten all coordinate pairs from geometry
function getAllCoords(geometry) {
  const coords = [];
  function recurse(arr, depth) {
    if (depth === 0) {
      coords.push(arr); // [lng, lat]
    } else {
      arr.forEach(item => recurse(item, depth - 1));
    }
  }
  const depthMap = { Point: 0, MultiPoint: 1, LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3 };
  const depth = depthMap[geometry.type];
  recurse(geometry.coordinates, depth);
  return coords;
}

// Calculate centroid (mean of all coordinate points)
function calcCentroid(geometry) {
  const coords = getAllCoords(geometry);
  const sum = coords.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
  return { lng: sum.lng / coords.length, lat: sum.lat / coords.length };
}

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
const centers = mapoFeatures.map(f => {
  const centroid = calcCentroid(f.geometry);
  return {
    dong_nm: f.properties.adm_nm.split(' ').pop(),
    adm_cd: f.properties.adm_cd,
    adm_cd2: f.properties.adm_cd2,
    lat: Math.round(centroid.lat * 1e7) / 1e7,
    lng: Math.round(centroid.lng * 1e7) / 1e7,
  };
});

// Write files
mkdirSync(join(ROOT, 'data'), { recursive: true });

const boundariesPath = join(ROOT, 'data', 'seoul-mapo-dong-boundaries.geojson');
const centersPath = join(ROOT, 'data', 'seoul-mapo-dong-centers.json');

writeFileSync(boundariesPath, JSON.stringify(boundariesGeoJSON), 'utf-8');
writeFileSync(centersPath, JSON.stringify(centers, null, 2), 'utf-8');

// Report
const boundariesSize = Buffer.byteLength(JSON.stringify(boundariesGeoJSON), 'utf-8');
const centersSize = Buffer.byteLength(JSON.stringify(centers, null, 2), 'utf-8');

console.log('\n=== 결과 ===');
console.log(`추출된 마포구 행정동 수: ${mapoFeatures.length}개`);
console.log(`boundaries 파일 크기: ${(boundariesSize / 1024).toFixed(1)} KB`);
console.log(`centers 파일 크기: ${(centersSize / 1024).toFixed(1)} KB`);
console.log('\n사용 가능한 properties 필드:');
console.log('  dong_nm  — 행정동 이름 (예: 합정동)');
console.log('  adm_cd   — 행정동 코드 8자리');
console.log('  adm_cd2  — 행정동 코드 10자리');
console.log('  sggnm    — 시군구 이름 (마포구)');
console.log('\ncenter 샘플:');
centers.slice(0, 3).forEach(c => console.log(' ', JSON.stringify(c)));
