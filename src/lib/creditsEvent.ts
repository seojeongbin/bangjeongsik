/**
 * 크레딧 잔액 변경 브로드캐스트 — Navbar의 상시 잔액 표시(CreditBalance)와
 * /explore 분석 흐름처럼 서로 다른 컴포넌트 트리에 있는 컴포넌트를
 * 전역 상태 라이브러리 없이 동기화하기 위한 최소 이벤트 버스.
 * 새 값을 이미 아는 경우(API 응답에 balance 포함) detail로 즉시 반영,
 * 모르면 리스너가 자체적으로 재조회한다.
 */

export const CREDITS_CHANGED_EVENT = 'credits:changed'

export function notifyCreditsChanged(balance?: number) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT, { detail: { balance } }))
}
