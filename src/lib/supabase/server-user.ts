import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server Component·Route Handler에서 "현재 로그인 사용자"로 쿼리하는 클라이언트.
 * RLS가 적용되므로 본인 소유 데이터만 조회 가능. 특권 쓰기는 supabaseAdmin(server.ts) 사용.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component에서 호출된 경우 쿠키를 못 씀 — 미들웨어가 세션 갱신을 담당하므로 무시
          }
        },
      },
    }
  )
}
