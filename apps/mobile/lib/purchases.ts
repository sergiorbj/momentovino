import { Platform } from 'react-native'
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases'

import { fetchEntitlement } from '../features/entitlement/api'

export const PRO_ENTITLEMENT_ID = 'momentovino_pro'

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY

let configured = false

export async function configurePurchases(userId: string): Promise<void> {
  if (Platform.OS !== 'ios') return
  if (!IOS_API_KEY) {
    console.warn('EXPO_PUBLIC_REVENUECAT_IOS_KEY missing — skipping RevenueCat init')
    return
  }

  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN)
    Purchases.configure({ apiKey: IOS_API_KEY, appUserID: userId })
    configured = true
    return
  }

  await Purchases.logIn(userId)
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings()
  return offerings.current ?? null
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases()
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo()
}

export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false
  return info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined
}

/**
 * Boot-time gate: prefers server-mirrored entitlement (`profiles` via
 * `user_entitlement`), falls back to RevenueCat while the webhook catches up
 * or when migration isn't applied yet.
 *
 * Non‑iOS / missing API key → treat as Pro so dev/Android aren't blocked.
 */
export async function isProActive(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true
  if (!IOS_API_KEY) return true
  try {
    const server = await fetchEntitlement()
    if (server.isPro) return true
    const info = await getCustomerInfo()
    return hasProEntitlement(info)
  } catch (err) {
    console.warn('Failed to check entitlement', err)
    return false
  }
}
