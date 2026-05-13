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

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import {
  getCurrentOffering,
  getMonthlyEquivalent,
  getYearlyDiscountPercent,
  hasProEntitlement,
  PRO_ENTITLEMENT_ID,
  purchasePackage,
  restorePurchases,
} from '../../lib/purchases'
import { queryKeys } from '../../lib/query-keys'
import { useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const BENEFIT_KEYS: { icon: string; key: 'atlas' | 'family' | 'story' }[] = [
  { icon: '🌍', key: 'atlas' },
  { icon: '🍷', key: 'family' },
  { icon: '📸', key: 'story' },
]

type PlanId = 'yearly' | 'monthly'

export default function PaywallScreen() {
  const { t } = useTranslation()
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
        t('onboarding.paywall.errors.unavailableTitle'),
        t('onboarding.paywall.errors.unavailableBody'),
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
      router.replace('/onboarding/save-account')
    } catch (err: unknown) {
      // RC sets `userCancelled: true` when user dismisses the Apple sheet.
      if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) {
        return
      }
      const msg =
        err instanceof Error
          ? err.message
          : t('onboarding.paywall.errors.subscribeFailedFallback')
      Alert.alert(t('onboarding.paywall.errors.subscribeFailedTitle'), msg)
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
          t('onboarding.paywall.errors.nothingToRestoreTitle'),
          t('onboarding.paywall.errors.nothingToRestoreBody'),
        )
        return
      }
      await qc.invalidateQueries({ queryKey: queryKeys.entitlement })
      router.replace('/onboarding/save-account')
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('onboarding.paywall.errors.restoreFailedFallback')
      Alert.alert(t('onboarding.paywall.errors.restoreFailedTitle'), msg)
    } finally {
      setPurchasing(false)
    }
  }

  const ctaLabel = purchasing
    ? t('onboarding.paywall.ctaStarting')
    : selectedPlan === 'yearly'
      ? t('onboarding.paywall.ctaSubscribeYearly', { price: annualPriceString })
      : t('onboarding.paywall.ctaTrialMonthly')

  const reassureText =
    selectedPlan === 'yearly'
      ? t('onboarding.paywall.reassureYearly')
      : t('onboarding.paywall.reassureMonthly', { price: monthlyPriceString })

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ProgressBar step={5} total={6} />

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copy}>
            <Text style={styles.headline}>{t('onboarding.paywall.headline')}</Text>
            <Text style={styles.sub}>{t('onboarding.paywall.subtitle')}</Text>
          </View>

          <View style={styles.benefits}>
            {BENEFIT_KEYS.map((b) => (
              <View key={b.key} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <Text style={styles.benefitText}>
                  {t(`onboarding.paywall.benefits.${b.key}`)}
                </Text>
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
                  <Text style={styles.planTitle}>{t('onboarding.paywall.monthly')}</Text>
                  <Text style={styles.planDetail} numberOfLines={1}>
                    <Text style={styles.planDetailStrong}>
                      {t('onboarding.paywall.monthlyDetailPrefix')}
                    </Text>
                    {t('onboarding.paywall.monthlyDetailSuffix')}
                  </Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{monthlyPriceString}</Text>
                  <Text style={styles.planPeriod}>{t('onboarding.paywall.perMonth')}</Text>
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
                  {t('onboarding.paywall.badge', { percent: annualDiscountPercent })}
                </Text>
              </View>
              <View style={styles.planRow}>
                <View style={styles.planLeft}>
                  <Text style={styles.planTitle}>{t('onboarding.paywall.annual')}</Text>
                  <Text style={styles.planDetail}>
                    {t('onboarding.paywall.annualDetail', { monthly: annualMonthlyEquivalent })}
                  </Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{annualPriceString}</Text>
                  <Text style={styles.planPeriod}>{t('onboarding.paywall.perYear')}</Text>
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
              <Text style={styles.tinyLink}>{t('onboarding.paywall.restore')}</Text>
            </TouchableOpacity>
            <Text style={styles.tinyDot}>·</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.tinyLink}>{t('onboarding.paywall.terms')}</Text>
            </TouchableOpacity>
            <Text style={styles.tinyDot}>·</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.tinyLink}>{t('onboarding.paywall.privacy')}</Text>
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
  scrollFlex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  copy: { alignItems: 'center', gap: 10, marginBottom: 14 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
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
  benefits: { gap: 10, marginBottom: 2 },
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
  plans: { gap: 2, paddingTop: 10 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: 'visible',
  },
  planCardYearly: { marginTop: 18, paddingTop: 22 },
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 8,
  },
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
    flexWrap: 'wrap',
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
