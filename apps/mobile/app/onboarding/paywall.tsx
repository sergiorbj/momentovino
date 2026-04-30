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
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { markOnboardingCompleted } from '../../features/onboarding/state'
import { getSelections, resetSelections } from '../../features/onboarding/selections'
import { seedStarterJournal } from '../../features/onboarding/seed'
import { claimUsername } from '../../features/profile/api'
import { getExistingMomentCount } from '../../lib/auth/returningUser'
import { supabase } from '../../lib/supabase'
import {
  getCurrentOffering,
  hasProEntitlement,
  purchasePackage,
  restorePurchases,
} from '../../lib/purchases'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const BENEFITS: { icon: string; text: string }[] = [
  { icon: '🌍', text: 'Your wine atlas, every bottle on the map' },
  { icon: '🍷', text: 'Share with family, register moments together' },
  { icon: '📸', text: 'Save the story behind every bottle' },
]

type PlanId = 'yearly' | 'monthly'

async function finishOnboarding() {
  const { pickedWineKeys } = getSelections()
  if (pickedWineKeys.length > 0) {
    const existing = await getExistingMomentCount()
    if (existing === 0) {
      await seedStarterJournal(pickedWineKeys)
    }
  }

  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (user && !user.is_anonymous) {
      const meta = user.user_metadata ?? {}
      const emailPrefix = user.email ? user.email.split('@')[0] : ''
      const desired =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        emailPrefix ||
        'user'
      await claimUsername(desired)
    }
  } catch (e) {
    console.warn('Failed to claim username (will retry on profile open)', e)
  }

  await markOnboardingCompleted()
  resetSelections()
  router.replace('/(tabs)/moments')
}

export default function PaywallScreen() {
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
  const monthlyPriceString = monthlyPkg?.product.priceString ?? '$4.99'
  const annualPriceString = annualPkg?.product.priceString ?? '$39.99'

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
        throw new Error('Subscription was not activated')
      }
      await finishOnboarding()
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
      await finishOnboarding()
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
      ? `Subscribe — ${annualPriceString}/year`
      : 'Start my 5-day free trial'

  const reassureText =
    selectedPlan === 'yearly'
      ? 'Billed annually. Cancel renewal anytime in Settings.'
      : `Free for 5 days, then ${monthlyPriceString}/month. Cancel anytime to avoid being charged.`

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={6} total={6} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copy}>
            <Text style={styles.headline}>Your wine memories, forever.</Text>
            <Text style={styles.sub}>
              Unlimited moments. Unlimited bottles. One beautiful journal you'll
              still have in 10 years.
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
                  <Text style={styles.planDetail} numberOfLines={1}>
                    <Text style={styles.planDetailStrong}>5 days free</Text>
                    , then billed
                  </Text>
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
                <Text style={styles.planBadgeText}>BEST VALUE · SAVE 33%</Text>
              </View>
              <View style={styles.planRow}>
                <View style={styles.planLeft}>
                  <Text style={styles.planTitle}>Annual</Text>
                  <Text style={styles.planDetail}>Just $3.33/month</Text>
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
            <TouchableOpacity onPress={restore} activeOpacity={0.7}>
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
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  copy: { alignItems: 'center', gap: 10, marginBottom: 22 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    lineHeight: 22,
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
  planDetailStrong: {
    fontFamily: 'DMSans_700Bold',
    color: INK,
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
