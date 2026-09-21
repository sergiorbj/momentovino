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

function ensureConfigured(): void {
  if (configured) return
  if (Platform.OS !== 'ios') return
  if (!IOS_API_KEY) {
    console.warn('EXPO_PUBLIC_REVENUECAT_IOS_KEY missing — skipping RevenueCat init')
    return
  }
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN)
    Purchases.configure({ apiKey: IOS_API_KEY })
    configured = true
  } catch (err) {
    // react-native-purchases is a native module — it throws inside Expo Go
    // ("native store is not available"). Swallow so the rest of the app boots;
    // dev builds and TestFlight have the native module and configure normally.
    console.warn('RevenueCat not available (likely Expo Go) — skipping', err)
  }
}

// Fire at module load so the singleton is ready before any screen
// (e.g. the onboarding paywall) calls into RevenueCat. The real userId is
// aliased in via `Purchases.logIn` once the Supabase session resolves.
ensureConfigured()

/**
 * `Purchases.logIn` only auto-transfers a device's active subscription onto
 * `userId` when that id has never been seen by RC before. If `userId`
 * already exists as a customer (e.g. this same account, on a fresh install
 * after the local RC cache was wiped), logIn just switches to it — the
 * subscription stays orphaned on whatever anonymous id currently holds the
 * App Store receipt. `syncPurchasesForResult` forces a non-interactive
 * receipt reconciliation, which is what actually fires RC's TRANSFER and
 * keeps the Supabase entitlement mirror correct after a reinstall.
 * https://www.revenuecat.com/docs/getting-started/restoring-purchases
 */
export async function configurePurchases(userId: string): Promise<void> {
  ensureConfigured()
  if (!configured) return
  await Purchases.logIn(userId)
  try {
    await Purchases.syncPurchasesForResult()
  } catch (err) {
    console.warn('configurePurchases: syncPurchasesForResult failed', err)
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  ensureConfigured()
  if (!configured) return null
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
 * Format an arbitrary numeric amount as a currency string using the device
 * locale. `currencyCode` comes straight from the RevenueCat product so the
 * symbol and grouping match what the Apple sheet will show at checkout.
 */
export function formatPriceWithCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

/**
 * Yearly price divided by 12, formatted in the same currency. Used on the
 * yearly card to advertise the effective monthly cost ("Just $2.08/month").
 */
export function getMonthlyEquivalent(annualPkg: PurchasesPackage | null): string | null {
  if (!annualPkg) return null
  const yearly = annualPkg.product.price
  const currency = annualPkg.product.currencyCode
  if (typeof yearly !== 'number' || yearly <= 0 || !currency) return null
  return formatPriceWithCurrency(yearly / 12, currency)
}

/**
 * Percentage saved by the yearly plan vs paying monthly all year.
 * Returns null if either package is missing, currencies differ, or the
 * yearly isn't actually cheaper.
 */
export function getYearlyDiscountPercent(
  monthlyPkg: PurchasesPackage | null,
  annualPkg: PurchasesPackage | null,
): number | null {
  if (!monthlyPkg || !annualPkg) return null
  const monthly = monthlyPkg.product.price
  const yearly = annualPkg.product.price
  if (
    typeof monthly !== 'number' ||
    typeof yearly !== 'number' ||
    monthly <= 0 ||
    yearly <= 0
  ) {
    return null
  }
  if (monthlyPkg.product.currencyCode !== annualPkg.product.currencyCode) return null
  const discount = 1 - yearly / (monthly * 12)
  if (discount <= 0) return null
  return Math.round(discount * 100)
}

/**
 * Boot-time gate: the server-mirrored entitlement (`profiles` via
 * `user_entitlement`) is the only source of truth. The RC webhook is
 * responsible for keeping it in sync — this never falls back to querying
 * RevenueCat/Apple directly, so a stale local StoreKit/RC cache can't
 * log a paying user out or show them the paywall.
 *
 * Non‑iOS / missing API key → treat as Pro so dev/Android aren't blocked.
 */
export async function isProActive(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true
  if (!IOS_API_KEY) return true
  try {
    const server = await fetchEntitlement()
    return server.isPro
  } catch (err) {
    console.warn('Failed to check entitlement', err)
    return false
  }
}
