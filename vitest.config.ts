import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Phase 2-2J: 결제·크레딧·구독 핵심 로직 테스트 러너 설정.
// 실 Supabase/Polar/AirROI를 절대 호출하지 않는 순수 로직 테스트만 포함 —
// 외부 의존성은 tests/ 안에서 전부 모킹한다 (docs/TESTING.md 참고).
export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // 'server-only'는 번들러 전용 가드 패키지 — Node 테스트 환경에서는 no-op으로 대체
      { find: 'server-only', replacement: path.resolve(__dirname, './tests/mocks/server-only.ts') },
      // strict ESM에서 'next/server' 서브패스가 확장자 없이 해석되지 않는 문제 우회
      { find: /^next\/server$/, replacement: path.resolve(__dirname, './node_modules/next/server.js') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 테스트가 실수로 실 키를 집어 쓰지 않도록 더미 env를 setup에서 강제 주입
    setupFiles: ['tests/setup.ts'],
    // @polar-sh/sdk의 zod 스키마 트리 로딩(웹훅 route import)이 저사양/CI에서
    // 10초를 넘길 수 있어 여유를 둔다
    hookTimeout: 60_000,
    testTimeout: 30_000,
    server: {
      deps: {
        // ESM 'next/server' 서브패스 해석을 위해 Vite 파이프라인으로 인라인 처리
        inline: ['@polar-sh/nextjs', '@polar-sh/adapter-utils'],
      },
    },
  },
})
