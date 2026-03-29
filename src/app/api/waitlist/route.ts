import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "유효하지 않은 이메일입니다." }, { status: 400 })
  }

  const { error } = await supabase.from("waitlist").insert({ email })

  if (error) {
    console.error("[waitlist] Supabase error:", error.code, error.message, error.details, error.hint)
    if (error.code === "23505") {
      return NextResponse.json({ message: "이미 등록된 이메일입니다." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json({ message: "등록 완료" }, { status: 200 })
}
