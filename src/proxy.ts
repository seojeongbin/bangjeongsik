import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

/**
 * 세션 필요 경로 prefix. 2-2C(핀 API)·2-2D(분석 API)에서 실제 핸들러가 생성되며,
 * 그 전에도 등록해 두면 핸들러 생성 즉시 게이트가 적용된다.
 * 최종 인가는 각 Route Handler + RLS에서도 재검증한다(다층 방어, PRD_phase2-2A_auth.md §5).
 */
const PROTECTED_PATH_PREFIXES = ["/api/map/airbnb-pins", "/api/analysis", "/api/credits"]

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  )

  if (isProtected && !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
}
