import { useEffect, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import {
  getCurrentOffering,
  getMonthlyEquivalent,
  getYearlyDiscountPercent,
  hasProEntitlement,
  PRO_ENTITLEMENT_ID,
  purchasePackage,
  restorePurchases,
} from '../lib/purchases'
import { queryKeys } from '../lib/query-keys'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const BENEFITS: { icon: string; text: string }[] = [
  { icon: '🍷', text: 'Unlimited wine scans, powered by AI' },
  { icon: '👨‍👩‍👧', text: 'Family sharing and shared cellars' },
  { icon: '📔', text: 'Every moment, kept forever in your journal' },
]

type PlanId = 'yearly' | 'monthly'

/**
 * Renewal paywall for users whose Pro plan expired (or was never active on
 * an existing account). Reached either from the boot gate in `app/index.tsx`
 * or from `afterSignIn()` in `app/login.tsx` when the signed-in user isn't Pro.
 *
 * Differs from `app/onboarding/paywall.tsx`:
 *  - No ProgressBar, no "step X of Y" framing.
 *  - No 3-day free trial wording — RevenueCat / Apple do not grant a second
 *    intro offer to the same Apple ID, and existing users are coming back to
 *    renew, not to trial.
 *  - Success routes to `/(tabs)/moments` (the user already has an account).
 *  - No back button / swipe-back gesture.
 */
export default function PaywallScreen() {
  const qc = useQueryClient()
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly')
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentOffering()
      .then((o) => {
        if (!cancelled) setOffering(o)
      })
      .catch((err) => console.warn('Failed to load offering', err))
    return () => {
      cancelled = true
    }
  }, [])

  const monthlyPkg: PurchasesPackage | null = offering?.monthly ?? null
  const annualPkg: PurchasesPackage | null = offering?.annual ?? null
  const monthlyPriceString = monthlyPkg?.product.priceString ?? '$2.99'
  const annualPriceString = annualPkg?.product.priceString ?? '$24.99'
  const annualMonthlyEquivalent = getMonthlyEquivalent(annualPkg) ?? '$2.08'
  const annualDiscountPercent = getYearlyDiscountPercent(monthlyPkg, annualPkg) ?? 30

  const subscribe = async () => {
    const pkg = selectedPlan === 'yearly' ? annualPkg : monthlyPkg
    if (!pkg) {
      Alert.alert(
        'Subscription unavailable',
        'Could not load subscription options. Please try again.',
      )
      return
    }
    setPurchasing(true)
    try {
      const customerInfo = await purchasePackage(pkg)
      if (!hasProEntitlement(customerInfo)) {
        const allEntitlements = Object.keys(customerInfo.entitlements?.all ?? {})
        const activeSubs = customerInfo.activeSubscriptions ?? []
        throw new Error(
          `Entitlement '${PRO_ENTITLEMENT_ID}' not active. ` +
            `Active subs: [${activeSubs.join(', ') || 'none'}]. ` +
            `Configured entitlements: [${allEntitlements.join(', ') || 'none'}]. ` +
            `appUserID: ${customerInfo.originalAppUserId ?? 'unknown'}`,
        )
      }
      await qc.invalidateQueries({ queryKey: queryKeys.entitlement })
      router.replace('/(tabs)/moments')
    } catch (err: unknown) {
      // RC sets `userCancelled: true` when user dismisses the Apple sheet.
      if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) {
        return
      }
      const msg = err instanceof Error ? err.message : 'Could not start subscription'
      Alert.alert('Subscription failed', msg)
    } finally {
      setPurchasing(false)
    }
  }

  const restore = async () => {
    setPurchasing(true)
    try {
      const customerInfo = await restorePurchases()
      if (!hasProEntitlement(customerInfo)) {
        Alert.alert(
          'Nothing to restore',
          'No active subscription found on this Apple ID.',
        )
        return
      }
      await qc.invalidateQueries({ queryKey: queryKeys.entitlement })
      router.replace('/(tabs)/moments')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not restore purchases'
      Alert.alert('Restore failed', msg)
    } finally {
      setPurchasing(false)
    }
  }

  const ctaLabel = purchasing
    ? 'Starting…'
    : selectedPlan === 'yearly'
      ? `Renew — ${annualPriceString}/year`
      : `Renew — ${monthlyPriceString}/month`

  const reassureText =
    selectedPlan === 'yearly'
      ? 'Billed annually. Cancel renewal anytime in Settings.'
      : 'Billed monthly. Cancel renewal anytime in Settings.'

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>MOMENTOVINO PRO</Text>
            <Text style={styles.headline}>Welcome back. Your Pro plan ended.</Text>
            <Text style={styles.sub}>
              Renew to keep scanning labels, saving moments, and sharing your
              cellar with the family.
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedPlan('monthly')}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
            >
              <View style={styles.planRow}>
                <View style={styles.planLeft}>
                  <Text style={styles.planTitle}>Monthly</Text>
                  <Text style={styles.planDetail}>Cancel renewal anytime</Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{monthlyPriceString}</Text>
                  <Text style={styles.planPeriod}>per month</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedPlan === 'monthly' && styles.radioSelected,
                  ]}
                >
                  {selectedPlan === 'monthly' && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedPlan('yearly')}
              style={[
                styles.planCard,
                styles.planCardYearly,
                selectedPlan === 'yearly' && styles.planCardSelected,
              ]}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>
                  BEST VALUE · SAVE {annualDiscountPercent}%
                </Text>
              </View>
              <View style={styles.planRow}>
                <View style={styles.planLeft}>
                  <Text style={styles.planTitle}>Annual</Text>
                  <Text style={styles.planDetail}>Just {annualMonthlyEquivalent}/month</Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{annualPriceString}</Text>
                  <Text style={styles.planPeriod}>per year</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedPlan === 'yearly' && styles.radioSelected,
                  ]}
                >
                  {selectedPlan === 'yearly' && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, purchasing && styles.ctaDisabled]}
            onPress={subscribe}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.reassure}>{reassureText}</Text>
          <View style={styles.tinyRow}>
            <TouchableOpacity onPress={restore} activeOpacity={0.7} disabled={purchasing}>
              <Text style={styles.tinyLink}>Restore purchases</Text>
            </TouchableOpacity>
            <Text style={styles.tinyDot}>·</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.tinyLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.tinyDot}>·</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.tinyLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 },
  copy: { alignItems: 'center', gap: 10, marginBottom: 22 },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: WINE,
    letterSpacing: 2,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
  },
  benefits: { gap: 10, marginBottom: 24 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  benefitIcon: { fontSize: 22 },
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  plans: { gap: 14 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  planCardYearly: { marginTop: 8 },
  planCardSelected: { borderColor: WINE, borderWidth: 2 },
  planBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: WINE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planLeft: { flex: 1, gap: 4 },
  planTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'DMSans_700Bold',
    color: INK,
  },
  planDetail: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  planRight: { alignItems: 'flex-end', gap: 4 },
  planPrice: {
    fontSize: 20,
    lineHeight: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  planPeriod: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_500Medium',
    color: SUBTLE,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: WINE, borderColor: WINE },
  footer: { paddingHorizontal: 24, paddingBottom: 14, gap: 12 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
  },
  reassure: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
  },
  tinyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  tinyLink: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: SUBTLE,
    textDecorationLine: 'underline',
  },
  tinyDot: { fontSize: 13, color: SUBTLE },
})
