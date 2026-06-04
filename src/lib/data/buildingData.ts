import 'server-only'

export interface BuildingResult {
  result: 'possible' | 'difficult' | 'unknown'
  label: string
  color: 'green' | 'yellow' | 'gray'
  buildingPurpose: string
  floors: string
  approvalDate: string
  district: string
  checkedAt: string
}

export async function getBuildingData(address: string): Promise<BuildingResult> {
  const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
  const SEUMTER_KEY = process.env.SEUMTER_API_KEY

  if (!KAKAO_KEY || !SEUMTER_KEY) throw new Error('BUILDING_CONFIG_MISSING')

  const today = new Date()
  const checkedAt = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`

  // 1. 카카오 주소 → 법정동 정보 추출
  const kakaoRes = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
  )
  if (!kakaoRes.ok) throw new Error('KAKAO_API_FAILED')

  const kakaoData = await kakaoRes.json()
  const doc = kakaoData.documents?.[0]
  if (!doc?.address) throw new Error('ADDRESS_NOT_FOUND')

  const bCode: string = doc.address.b_code
  const district: string = doc.address.region_2depth_name
  const mainAddressNo: string = doc.address.main_address_no || ''
  const subAddressNo: string = doc.address.sub_address_no || ''

  if (!bCode || bCode.length < 10) throw new Error('BCODE_INVALID')

  const sigunguCd = bCode.substring(0, 5)
  const bjdongCd = bCode.substring(5, 10)
  const bun = mainAddressNo.padStart(4, '0')
  const ji = subAddressNo ? subAddressNo.padStart(4, '0') : '0000'

  // 2. 건축HUB API (표제부)
  const params = new URLSearchParams({
    serviceKey: SEUMTER_KEY,
    sigunguCd,
    bjdongCd,
    platGbCd: '0',
    bun,
    ji,
    numOfRows: '10',
    pageNo: '1',
    _type: 'json',
  })

  const hubRes = await fetch(
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?${params.toString()}`,
  )
  if (!hubRes.ok) throw new Error('SEUMTER_API_FAILED')

  const hubData = await hubRes.json()
  const items = hubData?.response?.body?.items?.item

  if (!items || (Array.isArray(items) && items.length === 0)) {
    return {
      result: 'unknown',
      label: '확인 필요',
      color: 'gray',
      buildingPurpose: '조회 결과 없음',
      floors: '-',
      approvalDate: '-',
      district,
      checkedAt,
    }
  }

  const item = Array.isArray(items) ? items[0] : items
  const mainPurps: string = item.mainPurpsCdNm || ''
  const etcPurps: string = item.etcPurps || ''
  const combined = `${mainPurps} ${etcPurps}`

  let result: 'possible' | 'difficult' | 'unknown'
  let label: string
  let color: 'green' | 'yellow' | 'gray'

  if (combined.includes('단독주택') || combined.includes('다가구')) {
    result = 'possible'
    label = '가능성 있음'
    color = 'green'
  } else if (
    combined.includes('아파트') ||
    combined.includes('연립') ||
    combined.includes('다세대')
  ) {
    result = 'difficult'
    label = '등록 어려울 수 있음'
    color = 'yellow'
  } else {
    result = 'unknown'
    label = '확인 필요'
    color = 'gray'
  }

  const buildingPurpose = etcPurps ? `${mainPurps} (${etcPurps})` : mainPurps || '정보 없음'
  const grndFlrCnt: number = item.grndFlrCnt ?? 0
  const ugrndFlrCnt: number = item.ugrndFlrCnt ?? 0
  const floors = `지상 ${grndFlrCnt}층 / 지하 ${ugrndFlrCnt}층`

  let approvalDate = '-'
  const raw = item.useAprDay
  if (raw && typeof raw === 'string' && raw.length === 8) {
    approvalDate = `${raw.substring(0, 4)}년 ${raw.substring(4, 6)}월 ${raw.substring(6, 8)}일`
  }

  return { result, label, color, buildingPurpose, floors, approvalDate, district, checkedAt }
}
