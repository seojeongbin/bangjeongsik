import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
  const SEUMTER_KEY = process.env.SEUMTER_API_KEY

  if (!KAKAO_KEY || !SEUMTER_KEY) {
    return NextResponse.json({ error: "서버 환경변수가 설정되지 않았습니다." }, { status: 500 })
  }

  let address: string
  try {
    const body = await req.json()
    address = body.address
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 })
  }

  // 1. 카카오 주소 → 법정동 정보 추출
  let bCode: string
  let district: string
  let mainAddressNo: string
  let subAddressNo: string

  try {
    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`
    const kakaoRes = await fetch(kakaoUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    })

    if (!kakaoRes.ok) {
      return NextResponse.json({ error: "주소 변환에 실패했습니다." }, { status: 400 })
    }

    const kakaoData = await kakaoRes.json()
    const doc = kakaoData.documents?.[0]

    if (!doc?.address) {
      return NextResponse.json({ error: "주소를 찾을 수 없습니다." }, { status: 400 })
    }

    bCode = doc.address.b_code
    district = doc.address.region_2depth_name
    mainAddressNo = doc.address.main_address_no || ""
    subAddressNo = doc.address.sub_address_no || ""

  } catch {
    return NextResponse.json({ error: "주소 변환 중 오류가 발생했습니다." }, { status: 400 })
  }

  if (!bCode || bCode.length < 10) {
    return NextResponse.json({ error: "법정동 코드를 추출할 수 없습니다." }, { status: 400 })
  }

  const sigunguCd = bCode.substring(0, 5)
  const bjdongCd = bCode.substring(5, 10)
  const bun = mainAddressNo.padStart(4, "0")
  const ji = subAddressNo ? subAddressNo.padStart(4, "0") : "0000"

  // 2. 건축HUB API 호출 (표제부 — getBrTitleInfo)
  const today = new Date()
  const checkedAt = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`

  try {
    const params = new URLSearchParams({
      serviceKey: SEUMTER_KEY,
      sigunguCd,
      bjdongCd,
      platGbCd: "0",
      bun,
      ji,
      numOfRows: "10",
      pageNo: "1",
      _type: "json",
    })

    const hubUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?${params.toString()}`

    const hubRes = await fetch(hubUrl)

    if (!hubRes.ok) {
      return NextResponse.json({ error: "건축물대장 조회에 실패했습니다." }, { status: 502 })
    }

    const hubData = await hubRes.json()

    const items = hubData?.response?.body?.items?.item

    if (!items || (Array.isArray(items) && items.length === 0)) {
      return NextResponse.json({
        result: "unknown" as const,
        label: "확인 필요",
        color: "gray" as const,
        buildingPurpose: "조회 결과 없음",
        floors: "-",
        approvalDate: "-",
        district,
        checkedAt,
      })
    }

    const item = Array.isArray(items) ? items[0] : items
    const mainPurps = item.mainPurpsCdNm || ""
    const etcPurps = item.etcPurps || ""
    const combined = `${mainPurps} ${etcPurps}`

    // 3. 외도민 등록 가능성 판단
    let result: "possible" | "difficult" | "unknown"
    let label: string
    let color: "green" | "yellow" | "gray"

    if (combined.includes("단독주택") || combined.includes("다가구")) {
      result = "possible"
      label = "가능성 있음"
      color = "green"
    } else if (
      combined.includes("아파트") ||
      combined.includes("연립") ||
      combined.includes("다세대")
    ) {
      result = "difficult"
      label = "등록 어려울 수 있음"
      color = "yellow"
    } else {
      result = "unknown"
      label = "확인 필요"
      color = "gray"
    }

    const buildingPurpose = etcPurps ? `${mainPurps} (${etcPurps})` : mainPurps || "정보 없음"
    const grndFlrCnt = item.grndFlrCnt ?? 0
    const ugrndFlrCnt = item.ugrndFlrCnt ?? 0
    const floors = `지상 ${grndFlrCnt}층 / 지하 ${ugrndFlrCnt}층`

    let approvalDate = "-"
    const raw = item.useAprDay
    if (raw && typeof raw === "string" && raw.length === 8) {
      approvalDate = `${raw.substring(0, 4)}년 ${raw.substring(4, 6)}월 ${raw.substring(6, 8)}일`
    }

    return NextResponse.json({
      result,
      label,
      color,
      buildingPurpose,
      floors,
      approvalDate,
      district,
      checkedAt,
    })
  } catch {
    return NextResponse.json({ error: "건축물대장 조회 중 오류가 발생했습니다." }, { status: 502 })
  }
}
