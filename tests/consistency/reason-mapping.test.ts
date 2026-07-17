import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * [4] 교차 일관성 — 크레딧 reason·구독 status가 SQL CHECK 제약, 웹훅 상수,
 * 마이페이지 한글 매핑 사이에서 어긋나지 않는지 (Phase 2-2J).
 * 소스 파일을 텍스트로 파싱해 집합 비교 — 새 reason/status를 한쪽에만 추가하면
 * 이 테스트가 실패해 매핑 누락(마이페이지에 영문 raw 노출 등)을 조기에 잡는다.
 */

const root = path.resolve(__dirname, '../..')
const read = (p: string) => readFileSync(path.join(root, p), 'utf-8')

const ledgerSql = read('supabase/migrations/20260707000002_credits_ledger.sql')
const subsSql = read('supabase/migrations/20260715000001_subscriptions.sql')
const webhookSrc = read('src/app/api/webhooks/polar/route.ts')
const mypageSrc = read('src/components/mypage/MyPageContent.tsx')

/** SQL CHECK (x in ('a', 'b', ...)) 안의 문자열 리터럴 추출 */
function sqlCheckValues(sql: string, column: string): Set<string> {
  const re = new RegExp(`${column}\\s+text\\s+not null check \\(${column} in \\(([\\s\\S]*?)\\)\\)`)
  const m = sql.match(re)
  expect(m, `${column} CHECK 제약을 찾지 못함`).toBeTruthy()
  return new Set([...m![1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]))
}

/** { key: '값', ... } 형태 객체 리터럴의 키 추출 */
function objectKeys(src: string, marker: string): Set<string> {
  const start = src.indexOf(marker)
  expect(start, `${marker} 를 찾지 못함`).toBeGreaterThanOrEqual(0)
  const end = src.indexOf('}', start)
  const block = src.slice(start, end)
  return new Set([...block.matchAll(/^\s*([a-z_]+):/gm)].map((x) => x[1]))
}

describe('크레딧 reason 일관성', () => {
  const sqlReasons = sqlCheckValues(ledgerSql, 'reason')

  it('SQL CHECK reason 집합은 확정된 6종이다', () => {
    expect(sqlReasons).toEqual(
      new Set([
        'signup_free',
        'purchase_basic',
        'purchase_pro',
        'subscription_monthly',
        'consume_report',
        'refund',
      ]),
    )
  })

  it('마이페이지 REASON_LABELS는 SQL의 모든 reason에 한글 매핑을 가진다 (누락 시 영문 raw 노출)', () => {
    const labelKeys = objectKeys(mypageSrc, 'const REASON_LABELS')
    for (const reason of sqlReasons) {
      expect(labelKeys, `REASON_LABELS에 '${reason}' 매핑 누락`).toContain(reason)
    }
  })

  it('웹훅 PLAN_CREDITS가 쓰는 reason은 전부 SQL CHECK에 존재한다 (아니면 지급 INSERT가 터짐)', () => {
    const used = [...webhookSrc.matchAll(/reason: '([a-z_]+)'/g)].map((m) => m[1])
    expect(used.length).toBeGreaterThan(0)
    for (const reason of used) {
      expect(sqlReasons, `웹훅 reason '${reason}'이 SQL CHECK에 없음`).toContain(reason)
    }
  })

  it('플랜별 지급 수량 확정값: basic +3 / pro +10 / sub_basic +4', () => {
    expect(webhookSrc).toMatch(/basic: \{ delta: 3, reason: 'purchase_basic' \}/)
    expect(webhookSrc).toMatch(/pro: \{ delta: 10, reason: 'purchase_pro' \}/)
    expect(webhookSrc).toMatch(/sub_basic: \{ delta: 4, reason: 'subscription_monthly' \}/)
  })
})

describe('구독 status 일관성', () => {
  const sqlStatuses = sqlCheckValues(subsSql, 'status')

  it('웹훅 KNOWN_SUB_STATUSES == subscriptions CHECK 집합 (불일치 시 지급 루프/INSERT 실패)', () => {
    const start = webhookSrc.indexOf('const KNOWN_SUB_STATUSES')
    expect(start).toBeGreaterThanOrEqual(0)
    const end = webhookSrc.indexOf('])', start)
    const block = webhookSrc.slice(start, end)
    const known = new Set([...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]))
    expect(known).toEqual(sqlStatuses)
  })
})
