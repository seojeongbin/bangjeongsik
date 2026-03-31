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

  try {
    const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true })

    const kstTime = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date())

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `📬 새 구독자 등록!\n이메일: ${email}\n시간: ${kstTime}\n누적 구독자: ${count ?? "?"}명 🎯`,
        }),
      })
    }
  } catch (discordError) {
    console.error("[waitlist] Discord 알림 실패:", discordError)
  }

  return NextResponse.json({ message: "등록 완료" }, { status: 200 })
}
