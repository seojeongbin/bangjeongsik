// 'server-only' 패키지는 클라이언트 번들 유입을 막는 가드용으로, Node(vitest)
// 환경에서 import하면 throw한다. 테스트에서는 의미가 없으므로 no-op으로 대체.
export {}
