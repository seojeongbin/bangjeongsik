import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

// 전국 임의 주소 대상, 밀도(개/km²) 기준 — 변경 시 전체 지역 영향 있음
function getLabel(count: number, radius_m: number): { label: string; color: "green" | "yellow" | "red"; density: number } {
  const area = Math.PI * Math.pow(radius_m / 1000, 2)
  const density = count / area
  if (density <= 20) return { label: "경쟁 적음", color: "green", density }
  if (density <= 60) return { label: "경쟁 보통", color: "yellow", density }
  return { label: "경쟁 치열", color: "red", density }
}

export async function POST(req: NextRequest) {
  try {
    const { address, radius_m: rawRadius } = await req.json()

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "주소가 필요합니다." }, { status: 400 })
    }

    const radius_m = Math.min(1000, Math.max(100, typeof rawRadius === "number" ? rawRadius : 500))

    // 카카오 REST API로 주소 → 좌표 변환
    const kakaoKey = process.env.KAKAO_REST_API_KEY
    if (!kakaoKey) {
      return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 })
    }

    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
    )

    if (!kakaoRes.ok) {
      return NextResponse.json({ error: "주소 변환에 실패했습니다." }, { status: 502 })
    }

    const kakaoData = await kakaoRes.json()
    const doc = kakaoData.documents?.[0]

    if (!doc) {
      return NextResponse.json({ error: "주소를 찾을 수 없습니다." }, { status: 404 })
    }

    const lat = parseFloat(doc.y)
    const lng = parseFloat(doc.x)

    // Supabase RPC: 반경 N m 내 민박 수 조회
    const { data, error } = await supabaseAdmin.rpc("get_nearby_minbak", {
      user_lat: lat,
      user_lng: lng,
      radius_m,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: "데이터 조회에 실패했습니다." }, { status: 500 })
    }

    const count: number = typeof data === "number" ? data : (data as { count: number })?.count ?? 0
    const { label, color, density } = getLabel(count, radius_m)

    // 가장 최근 data_updated_at 조회
    const { data: metaData } = await supabaseAdmin
      .from("minbak_listings")
      .select("data_updated_at")
      .order("data_updated_at", { ascending: false })
      .limit(1)
      .single()

    const data_updated_at: string = metaData?.data_updated_at ?? ""

    return NextResponse.json({ count, label, color, density: Math.round(density * 10) / 10, data_updated_at })
  } catch (err) {
    console.error("Competition API error:", err)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}
