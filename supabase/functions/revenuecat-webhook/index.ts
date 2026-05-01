// =============================================================
// RevenueCat → Supabase entitlement webhook
// =============================================================
// Mirrors RC subscription state onto `public.profiles`.
//
// RC Dashboard config:
//   1) Project → Integrations → Webhooks → URL: this function's URL
//   2) Header `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH_HEADER>`
//   3) Set events: ALL (we filter inside)
//
// RC sends `app_user_id` = whatever we passed to Purchases.configure /
// Purchases.logIn, which is our Supabase user_id (uuid).
//
// Env (set with `supabase secrets set ...`):
//   REVENUECAT_WEBHOOK_AUTH_HEADER  shared secret (full "Bearer xxx" value)
//   PRO_ENTITLEMENT_ID              defaults to 'momentovino_pro'
//   SUPABASE_URL                    auto-provided
//   SUPABASE_SERVICE_ROLE_KEY       auto-provided
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type RcEvent = {
  id: string
  type:
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'CANCELLATION'
    | 'UNCANCELLATION'
    | 'NON_RENEWING_PURCHASE'
    | 'EXPIRATION'
    | 'BILLING_ISSUE'
    | 'PRODUCT_CHANGE'
    | 'SUBSCRIPTION_PAUSED'
    | 'SUBSCRIPTION_EXTENDED'
    | 'TRANSFER'
    | 'TEMPORARY_ENTITLEMENT_GRANT'
    | 'REFUND'
    | string
  app_user_id?: string
  original_app_user_id?: string
  event_timestamp_ms: number
  expiration_at_ms?: number | null
  purchased_at_ms?: number | null
  product_id?: string
  period_type?: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PROMOTIONAL' | string
  store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL' | string
  environment?: 'SANDBOX' | 'PRODUCTION' | string
  is_trial_conversion?: boolean
  cancel_reason?: string
  expiration_reason?: string
  entitlement_ids?: string[] | null
  entitlement_id?: string | null
  original_transaction_id?: string | null
  transferred_from?: string[] | null
  transferred_to?: string[] | null
}

const ENTITLEMENT_ID = Deno.env.get('PRO_ENTITLEMENT_ID') ?? 'momentovino_pro'
const AUTH_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_HEADER') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Events that *grant* the entitlement (active = true).
const ACTIVATING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
])
// Events that *revoke* immediately.
const REVOKING = new Set(['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED'])
// Soft signals: keep current active state (grace/billing retry handled by flags).
const NEUTRAL = new Set(['CANCELLATION', 'BILLING_ISSUE'])

function eventAffectsEntitlement(ev: RcEvent): boolean {
  // RC includes the entitlement IDs the event applies to. If the array is
  // missing, assume yes (safer to apply than to silently skip).
  const ids = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : null)
  if (!ids) return true
  return ids.includes(ENTITLEMENT_ID)
}

function uuidLike(v: string | null | undefined): boolean {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

async function handleTransfer(ev: RcEvent, eventAt: string) {
  // RC's TRANSFER means: this Apple ID's entitlement (`original_transaction_id`)
  // was reattached from one app_user_id to another. We zero the old one's
  // active flag and grant on the new one.
  const fromList = ev.transferred_from ?? []
  const toList = ev.transferred_to ?? []
  const from = fromList.find(uuidLike) ?? null
  const to = toList.find(uuidLike) ?? null
  const { error } = await supabase.rpc('transfer_revenuecat_entitlement', {
    p_from_user_id: from,
    p_to_user_id: to,
    p_event_at: eventAt,
  })
  if (error) throw error
}

async function handleStandard(ev: RcEvent, eventAt: string) {
  const userId = ev.app_user_id ?? ev.original_app_user_id ?? null
  if (!uuidLike(userId)) {
    console.warn('[rc-webhook] non-uuid app_user_id, skipping', { id: ev.id, userId })
    return
  }

  const expiresAt = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null

  let active: boolean
  if (ACTIVATING.has(ev.type)) {
    active = true
  } else if (REVOKING.has(ev.type)) {
    active = false
  } else if (NEUTRAL.has(ev.type)) {
    // Keep active = true if expiration is in the future, otherwise false.
    active = !!(expiresAt && new Date(expiresAt) > new Date())
  } else {
    console.warn('[rc-webhook] unknown event type', ev.type)
    return
  }

  const willRenew = !['CANCELLATION', 'EXPIRATION', 'REFUND'].includes(ev.type) && active
  const grace = ev.type === 'BILLING_ISSUE' && active
  const billingRetry = ev.type === 'BILLING_ISSUE'

  const { error } = await supabase.rpc('apply_revenuecat_event', {
    p_user_id: userId,
    p_active: active,
    p_expires_at: expiresAt,
    p_will_renew: willRenew,
    p_grace: grace,
    p_billing_retry: billingRetry,
    p_period_type: ev.period_type ?? null,
    p_store: ev.store ?? null,
    p_product_id: ev.product_id ?? null,
    p_original_tx_id: ev.original_transaction_id ?? null,
    p_environment: ev.environment ?? null,
    p_event_at: eventAt,
  })
  if (error) throw error
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (!AUTH_SECRET || auth !== AUTH_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: { event: RcEvent } | null = null
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }
  const ev = payload?.event
  if (!ev || !ev.type || !ev.event_timestamp_ms) {
    return new Response('Missing event', { status: 400 })
  }

  if (!eventAffectsEntitlement(ev)) {
    return new Response(JSON.stringify({ ignored: 'wrong_entitlement' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const eventAt = new Date(ev.event_timestamp_ms).toISOString()

  try {
    if (ev.type === 'TRANSFER') {
      await handleTransfer(ev, eventAt)
    } else {
      await handleStandard(ev, eventAt)
    }
  } catch (err) {
    console.error('[rc-webhook] error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
