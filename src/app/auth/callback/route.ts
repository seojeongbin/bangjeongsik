import * as Sentry from "@sentry/nextjs"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/explore"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Free 1회 크레딧 지급 (Phase 2-2B) — grant_free_credit RPC가 원자·멱등
      // (profiles.free_credit_granted 행 잠금으로 계정당 1회 보장).
      // 실패해도 로그인은 진행 — 다음 로그인 시 재시도됨.
      if (data.user) {
        const { error: grantError } = await supabaseAdmin.rpc("grant_free_credit", {
          p_user_id: data.user.id,
        })
        if (grantError) {
          Sentry.captureException(grantError, {
            tags: { api: "auth-callback", rpc: "grant_free_credit" },
            extra: { user_id: data.user.id },
          })
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?login_error=1`)
}
