/**
 * supabaseAdmin 인메모리 목 (Phase 2-2J).
 *
 * RPC 3종(grant_purchase_credits / consume_credit_and_create_report /
 * upsert_subscription_state)의 동작을 마이그레이션 SQL
 * (20260707000002, 20260715000001) 의미 그대로 에뮬레이션한다.
 * — 실제 Postgres 원자성(FOR UPDATE·PK 충돌)은 Node에서 실행할 수 없으므로,
 *   SQL 텍스트 자체는 tests/sql/rpc-contract.test.ts가 별도로 고정(계약)하고
 *   여기서는 그 의미(직렬화·멱등·stale guard)를 재현해 호출부 로직을 검증한다.
 */

export interface LedgerRow {
  id: string
  user_id: string
  delta: number
  reason: string
  ref_id: string | null
  created_at: string
}

export interface SubscriptionRow {
  polar_subscription_id: string
  user_id: string
  polar_customer_id: string
  product_id: string | null
  status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
  started_at: string | null
  ends_at: string | null
  polar_modified_at: string | null
}

export interface ReportRow {
  id: string
  user_id: string
  report_token: string
  lat: number
  lng: number
  radius_m: number
  address: string | null
}

interface RpcCall {
  name: string
  params: Record<string, unknown>
}

let seq = 0
const nextId = (prefix: string) => `${prefix}_${++seq}`

export function createSupabaseAdminMock() {
  const state = {
    profiles: new Set<string>(),
    ledger: [] as LedgerRow[],
    webhookEvents: new Map<string, { event_type: string; checkout_id: string | null }>(),
    subscriptions: new Map<string, SubscriptionRow>(),
    reports: [] as ReportRow[],
  }

  const rpcCalls: RpcCall[] = []
  /** rpc명 → 강제 에러 메시지 (1회성 아님 — 테스트에서 명시적으로 해제) */
  const forcedErrors = new Map<string, string>()

  const balance = (userId: string) =>
    state.ledger.filter((r) => r.user_id === userId).reduce((s, r) => s + r.delta, 0)

  // consume RPC의 "profiles 행 FOR UPDATE = 사용자 단위 직렬화" 에뮬레이션.
  // 사용자별 프라미스 체인으로 임계 구역을 직렬화한다.
  const userLocks = new Map<string, Promise<unknown>>()

  async function consumeCreditAndCreateReport(params: Record<string, unknown>) {
    const userId = params.p_user_id as string
    const critical = async () => {
      if (!state.profiles.has(userId)) throw new Error('PROFILE_NOT_FOUND')
      const bal = balance(userId)
      // 잔액 확인과 차감 사이에 의도적 틈 — 직렬화가 없으면 이중 차감이 재현되는 지점
      await new Promise((r) => setTimeout(r, 2))
      if (bal < 1) throw new Error('INSUFFICIENT_CREDITS')
      const reportId = nextId('report')
      const token = nextId('token')
      state.reports.push({
        id: reportId,
        user_id: userId,
        report_token: token,
        lat: params.p_lat as number,
        lng: params.p_lng as number,
        radius_m: params.p_radius_m as number,
        address: (params.p_address as string | null) ?? null,
      })
      state.ledger.push({
        id: nextId('tx'),
        user_id: userId,
        delta: -1,
        reason: 'consume_report',
        ref_id: reportId,
        created_at: new Date().toISOString(),
      })
      return [{ report_id: reportId, report_token: token, balance: bal - 1 }]
    }

    const prev = userLocks.get(userId) ?? Promise.resolve()
    const run = prev.then(critical, critical)
    userLocks.set(userId, run.then(() => undefined, () => undefined))
    return run
  }

  function grantPurchaseCredits(params: Record<string, unknown>) {
    const eventId = params.p_event_id as string
    if (state.webhookEvents.has(eventId)) return false // 중복 웹훅 — 스킵
    state.webhookEvents.set(eventId, {
      event_type: params.p_event_type as string,
      checkout_id: (params.p_checkout_id as string | null) ?? null,
    })
    state.ledger.push({
      id: nextId('tx'),
      user_id: params.p_user_id as string,
      delta: params.p_delta as number,
      reason: params.p_reason as string,
      ref_id: (params.p_ref_id as string | null) ?? null,
      created_at: new Date().toISOString(),
    })
    return true
  }

  function upsertSubscriptionState(params: Record<string, unknown>) {
    const subId = params.p_polar_subscription_id as string
    const incomingModified = params.p_polar_modified_at as string | null
    const existing = state.subscriptions.get(subId)

    if (existing) {
      if (
        existing.polar_modified_at !== null &&
        incomingModified !== null &&
        new Date(incomingModified) < new Date(existing.polar_modified_at)
      ) {
        return 'stale_skipped'
      }
      state.subscriptions.set(subId, {
        ...existing,
        polar_customer_id: params.p_polar_customer_id as string,
        product_id: (params.p_product_id as string | null) ?? null,
        status: params.p_status as string,
        cancel_at_period_end: params.p_cancel_at_period_end as boolean,
        current_period_end: (params.p_current_period_end as string | null) ?? null,
        started_at: (params.p_started_at as string | null) ?? null,
        ends_at: (params.p_ends_at as string | null) ?? null,
        polar_modified_at: incomingModified ?? existing.polar_modified_at,
      })
      return 'updated'
    }

    const userId = params.p_user_id as string | null
    if (userId === null || userId === undefined) return 'no_user_skipped'

    state.subscriptions.set(subId, {
      polar_subscription_id: subId,
      user_id: userId,
      polar_customer_id: params.p_polar_customer_id as string,
      product_id: (params.p_product_id as string | null) ?? null,
      status: params.p_status as string,
      cancel_at_period_end: params.p_cancel_at_period_end as boolean,
      current_period_end: (params.p_current_period_end as string | null) ?? null,
      started_at: (params.p_started_at as string | null) ?? null,
      ends_at: (params.p_ends_at as string | null) ?? null,
      polar_modified_at: incomingModified,
    })
    return 'inserted'
  }

  async function rpc(name: string, params: Record<string, unknown> = {}) {
    rpcCalls.push({ name, params })

    const forced = forcedErrors.get(name)
    if (forced) return { data: null, error: { message: forced } }

    try {
      switch (name) {
        case 'grant_purchase_credits':
          return { data: grantPurchaseCredits(params), error: null }
        case 'consume_credit_and_create_report':
          return { data: await consumeCreditAndCreateReport(params), error: null }
        case 'upsert_subscription_state':
          return { data: upsertSubscriptionState(params), error: null }
        default:
          return { data: null, error: { message: `unknown rpc: ${name}` } }
      }
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : String(err) } }
    }
  }

  // 웹훅 route가 쓰는 조회 체인: from('subscriptions').select('user_id').eq(...).maybeSingle()
  function from(table: string) {
    return {
      select() {
        return {
          eq(column: string, value: unknown) {
            return {
              async maybeSingle() {
                if (table === 'subscriptions' && column === 'polar_subscription_id') {
                  const row = state.subscriptions.get(value as string)
                  return { data: row ? { user_id: row.user_id } : null, error: null }
                }
                return { data: null, error: null }
              },
            }
          },
        }
      },
    }
  }

  return {
    client: { rpc, from },
    state,
    rpcCalls,
    balance,
    forceRpcError: (name: string, message: string) => forcedErrors.set(name, message),
    clearRpcError: (name: string) => forcedErrors.delete(name),
  }
}

export type SupabaseAdminMock = ReturnType<typeof createSupabaseAdminMock>
