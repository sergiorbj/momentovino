import { Platform } from 'react-native'
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases'

export const PRO_ENTITLEMENT_ID = 'pro'

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

// Boot-time gate. Treats unconfigured environments (non-iOS, missing API key)
// as "active" so dev/Android builds aren't blocked by the paywall.
export async function isProActive(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true
  if (!IOS_API_KEY) return true
  try {
    const info = await getCustomerInfo()
    return hasProEntitlement(info)
  } catch (err) {
    console.warn('Failed to check entitlement', err)
    return false
  }
}
