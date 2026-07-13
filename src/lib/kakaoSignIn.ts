import { createClient } from '@/lib/supabase/browser'

/**
 * 카카오 OAuth 로그인 시작 (브라우저 전용).
 * 카카오 개발자 콘솔 비즈니스 인증 전에는 account_email 동의항목 요청 불가(KOE205) —
 * scopes를 명시하지 않으면 Supabase가 기본 전체 스코프를 요청해 인가 코드 발급이 거부됨.
 */
export async function kakaoSignIn() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      // /auth/callback 기본 복귀 경로가 /explore — 로그인 후 이 화면으로 돌아옴
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'profile_nickname profile_image',
    },
  })
}
