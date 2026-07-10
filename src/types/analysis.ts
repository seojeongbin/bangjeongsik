// Phase 2-2D — 인라인 분석 리포트 공유 타입 (API 라우트 ↔ 클라이언트 패널)
// type-only import라 server-only 모듈이어도 클라이언트 번들에 포함되지 않음.
import type { AirbnbAreaStats } from '@/lib/data/airbnbData'
import type { BuildingResult } from '@/lib/data/buildingData'

export const RADIUS_PRESETS = [100, 250, 500, 1000, 2000] as const
export type RadiusPreset = (typeof RADIUS_PRESETS)[number]

export interface AnalysisReportMeta {
  lat: number
  lng: number
  radiusM: number
  bedrooms: number
  baths: number
  guests: number
  address: string | null
  createdAt: string
}

/** 리포트 본문 데이터 묶음 — 부분 실패 허용 (null = 해당 섹션 조회 실패) */
export interface AnalysisDataBundle {
  airbnb: AirbnbAreaStats | null
  building: BuildingResult | null
  competitionCount: number | null
  minbakUpdatedAt: string
}

export interface AnalysisResponse {
  reportId: string
  reportToken: string
  /** POST(신규 분석)에만 포함 — 차감 후 잔액 */
  balance?: number
  report: AnalysisReportMeta
  data: AnalysisDataBundle
}
