import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

function getLabel(count: number): { label: string; color: "green" | "yellow" | "red" } {
  if (count <= 3) return { label: "경쟁 적음", color: "green" }
  if (count <= 9) return { label: "경쟁 보통", color: "yellow" }
  return { label: "경쟁 치열", color: "red" }
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "주소가 필요합니다." }, { status: 400 })
    }

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

    // Supabase RPC: 반경 500m 내 민박 수 조회
    const { data, error } = await supabaseAdmin.rpc("get_nearby_minbak", {
      user_lat: lat,
      user_lng: lng,
      radius_m: 500,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: "데이터 조회에 실패했습니다." }, { status: 500 })
    }

    const count: number = typeof data === "number" ? data : (data as { count: number })?.count ?? 0
    const { label, color } = getLabel(count)

    // 가장 최근 data_updated_at 조회
    const { data: metaData } = await supabaseAdmin
      .from("minbak_listings")
      .select("data_updated_at")
      .order("data_updated_at", { ascending: false })
      .limit(1)
      .single()

    const data_updated_at: string = metaData?.data_updated_at ?? ""

    return NextResponse.json({ count, label, color, data_updated_at })
  } catch (err) {
    console.error("Competition API error:", err)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}
