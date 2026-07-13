import { redirect } from 'next/navigation'

// Phase 2-2G — /report(토큰 없음) 직접 접근 정상 처리.
// 리포트는 /explore 인라인 패널이 주 경로, /report/[token]은 재열람·구 토큰 호환용.
export default function ReportIndexPage() {
  redirect('/explore')
}
