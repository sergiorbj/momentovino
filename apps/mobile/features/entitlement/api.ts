import { supabase } from '../../lib/supabase'

export interface Entitlement {
  isPro: boolean
  expiresAt: string | null
  willRenew: boolean
  inGracePeriod: boolean
  inBillingRetry: boolean
  periodType: string | null
  store: string | null
  productId: string | null
  eventAt: string | null
}

const EMPTY: Entitlement = {
  isPro: false,
  expiresAt: null,
  willRenew: false,
  inGracePeriod: false,
  inBillingRetry: false,
  periodType: null,
  store: null,
  productId: null,
  eventAt: null,
}

/**
 * Reads the current user's entitlement from the `user_entitlement` view,
 * which honors `pro_expires_at` so an expired-but-still-flagged sub returns
 * `isPro: false` even before the EXPIRATION webhook lands.
 */
export async function fetchEntitlement(): Promise<Entitlement> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return EMPTY

  const { data, error } = await supabase
    .from('user_entitlement')
    .select(
      'is_pro, pro_expires_at, pro_will_renew, pro_in_grace_period, pro_in_billing_retry, pro_period_type, pro_store, pro_product_id, pro_event_at'
    )
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) {
    console.warn('[entitlement] fetch failed', error.message)
    return EMPTY
  }
  if (!data) return EMPTY

  return {
    isPro: !!data.is_pro,
    expiresAt: data.pro_expires_at,
    willRenew: !!data.pro_will_renew,
    inGracePeriod: !!data.pro_in_grace_period,
    inBillingRetry: !!data.pro_in_billing_retry,
    periodType: data.pro_period_type,
    store: data.pro_store,
    productId: data.pro_product_id,
    eventAt: data.pro_event_at,
  }
}
