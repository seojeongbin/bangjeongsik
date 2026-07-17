import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * SQL 계약(contract) 테스트 (Phase 2-2J).
 *
 * RPC의 원자성·멱등성은 Postgres 안에서만 실행되는 로직이라 Node 테스트로
 * 직접 실행할 수 없다. 대신 마이그레이션 SQL 원문에서 "돈이 걸린 안전장치
 * 구문"이 존재하는지·올바른 순서인지 고정한다 — 누군가 마이그레이션을 수정해
 * 잠금/멱등성/가드를 제거하면 이 테스트가 즉시 실패한다.
 * (에뮬레이션 테스트(tests/credits, tests/webhooks)와 한 쌍으로 동작.)
 */

const root = path.resolve(__dirname, '../..')
const ledgerSql = readFileSync(
  path.join(root, 'supabase/migrations/20260707000002_credits_ledger.sql'),
  'utf-8',
).toLowerCase()
const subsSql = readFileSync(
  path.join(root, 'supabase/migrations/20260715000001_subscriptions.sql'),
  'utf-8',
).toLowerCase()

/** fn 정의 블록만 잘라내기 (create function ~ 다음 create/revoke 전까지 대략) */
function fnBlock(sql: string, fnName: string): string {
  const start = sql.indexOf(`create function public.${fnName}`)
  expect(start, `${fnName} 함수 정의가 존재해야 함`).toBeGreaterThanOrEqual(0)
  const end = sql.indexOf('$$;', start)
  return sql.slice(start, end === -1 ? undefined : end)
}

describe('consume_credit_and_create_report — 원자적 차감 계약', () => {
  const fn = fnBlock(ledgerSql, 'consume_credit_and_create_report')

  it('profiles 행 FOR UPDATE 잠금(사용자 단위 직렬화)이 존재한다', () => {
    expect(fn).toMatch(/from public\.profiles where user_id = p_user_id for update/)
  })

  it('잔액은 SUM(delta)로 계산한다 (별도 잔액 컬럼 금지)', () => {
    expect(fn).toMatch(/coalesce\(sum\(t\.delta\), 0\)/)
  })

  it('잔액 부족 시 INSUFFICIENT_CREDITS 예외 — 리포트 INSERT보다 앞에 있어야 함(전체 롤백)', () => {
    const guardIdx = fn.indexOf("raise exception 'insufficient_credits'")
    const insertIdx = fn.indexOf('insert into public.analysis_reports')
    expect(guardIdx).toBeGreaterThanOrEqual(0)
    expect(insertIdx).toBeGreaterThanOrEqual(0)
    expect(guardIdx).toBeLessThan(insertIdx)
  })

  it('차감은 -1 고정 + consume_report 사유로 원장에 기록된다', () => {
    expect(fn).toMatch(/values \(p_user_id, -1, 'consume_report'/)
  })

  it('FOR UPDATE 잠금이 잔액 계산보다 앞선다 (잠금 전 읽기 = 레이스 구멍)', () => {
    const lockIdx = fn.indexOf('for update')
    const balanceIdx = fn.indexOf('coalesce(sum(t.delta)')
    expect(lockIdx).toBeGreaterThanOrEqual(0)
    expect(lockIdx).toBeLessThan(balanceIdx)
  })
})

describe('grant_purchase_credits — 웹훅 멱등성 계약', () => {
  const fn = fnBlock(ledgerSql, 'grant_purchase_credits')

  it('webhook_events PK 충돌 시 do nothing → not found → return false (중복 스킵)', () => {
    const conflictIdx = fn.indexOf('on conflict (event_id) do nothing')
    const notFoundIdx = fn.indexOf('if not found then')
    const returnFalseIdx = fn.indexOf('return false')
    expect(conflictIdx).toBeGreaterThanOrEqual(0)
    expect(notFoundIdx).toBeGreaterThan(conflictIdx)
    expect(returnFalseIdx).toBeGreaterThan(notFoundIdx)
  })

  it('중복 검사가 크레딧 INSERT보다 앞에 있어야 함 (검사 전 지급 = 이중 지급)', () => {
    const conflictIdx = fn.indexOf('on conflict (event_id) do nothing')
    const creditIdx = fn.indexOf('insert into public.credit_transactions')
    expect(conflictIdx).toBeLessThan(creditIdx)
  })
})

describe('grant_free_credit — 가입 무료 1회 계약', () => {
  const fn = fnBlock(ledgerSql, 'grant_free_credit')

  it('free_credit_granted=false 조건 UPDATE가 크레딧 INSERT보다 앞 (계정당 1회)', () => {
    const guardIdx = fn.indexOf('free_credit_granted = false')
    const creditIdx = fn.indexOf('insert into public.credit_transactions')
    expect(guardIdx).toBeGreaterThanOrEqual(0)
    expect(guardIdx).toBeLessThan(creditIdx)
  })
})

describe('쓰기 RPC 권한 계약 — service role 전용', () => {
  it.each([
    'grant_free_credit',
    'grant_purchase_credits',
    'consume_credit_and_create_report',
  ])('%s 는 anon/authenticated EXECUTE가 revoke되어야 함', (fnName) => {
    const re = new RegExp(
      `revoke execute on function public\\.${fnName}[\\s\\S]*?from public, anon, authenticated`,
    )
    expect(ledgerSql).toMatch(re)
  })

  it('upsert_subscription_state 도 revoke되어야 함', () => {
    expect(subsSql).toMatch(
      /revoke execute on function public\.upsert_subscription_state[\s\S]*?from public, anon, authenticated/,
    )
  })
})

describe('upsert_subscription_state — 역순 도착(stale) 가드 계약', () => {
  const fn = fnBlock(subsSql, 'upsert_subscription_state')

  it('기존 행을 FOR UPDATE로 잠근 뒤 판단한다', () => {
    expect(fn).toMatch(/where polar_subscription_id = p_polar_subscription_id\s+for update/)
  })

  it('오래된 이벤트(p_polar_modified_at < 저장값)는 stale_skipped로 무시된다', () => {
    const staleIdx = fn.indexOf('p_polar_modified_at < v_existing_modified')
    const skipIdx = fn.indexOf("return 'stale_skipped'")
    const updateIdx = fn.indexOf('update public.subscriptions')
    expect(staleIdx).toBeGreaterThanOrEqual(0)
    expect(skipIdx).toBeGreaterThan(staleIdx)
    expect(updateIdx).toBeGreaterThan(skipIdx) // 가드가 UPDATE보다 앞
  })

  it('신규 행인데 user_id 없으면 no_user_skipped (잘못된 귀속 방지)', () => {
    expect(fn).toMatch(/if p_user_id is null then\s+return 'no_user_skipped'/)
  })

  it('구독 마이그레이션은 크레딧 원장(credit_transactions)에 일절 개입하지 않는다', () => {
    expect(subsSql).not.toContain('insert into public.credit_transactions')
    expect(subsSql).not.toContain('update public.credit_transactions')
    expect(subsSql).not.toContain('delete from public.credit_transactions')
  })
})

describe('credit_transactions 스키마 계약', () => {
  it('delta <> 0 CHECK — 무의미한 0 행 금지', () => {
    expect(ledgerSql).toMatch(/delta\s+int\s+not null check \(delta <> 0\)/)
  })

  it('RLS 활성 + 본인 SELECT 정책만 (쓰기 정책 없음 = service role 전용)', () => {
    expect(ledgerSql).toContain('alter table public.credit_transactions enable row level security')
    expect(ledgerSql).toContain('credit_transactions_select_own')
    // credit_transactions에 대한 insert/update/delete 정책이 없어야 함
    expect(ledgerSql).not.toMatch(/create policy "credit_transactions_(insert|update|delete)/)
  })
})
