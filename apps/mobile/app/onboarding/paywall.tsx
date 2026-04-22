import { useState } from 'react'
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

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { markOnboardingCompleted } from '../../features/onboarding/state'
import { getSelections, resetSelections } from '../../features/onboarding/selections'
import { seedStarterJournal } from '../../features/onboarding/seed'
import { claimUsername } from '../../features/profile/api'
import { getExistingMomentCount } from '../../lib/auth/returningUser'
import { supabase } from '../../lib/supabase'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const BENEFITS: { icon: string; text: string }[] = [
  { icon: '📖', text: 'Unlimited wines and moments' },
  { icon: '🌍', text: 'Your wine atlas, synced across devices' },
  { icon: '🍷', text: 'Share with family — everyone adds their own bottles' },
]

export default function PaywallScreen() {
  const [purchasing, setPurchasing] = useState(false)

  const startTrial = async () => {
    setPurchasing(true)
    try {
      // TODO(revenuecat): replace with actual trial purchase.
      //   const offerings = await Purchases.getOfferings()
      //   const pkg = offerings.current?.monthly // 5-day free trial, $5.99/mo
      //   if (!pkg) throw new Error('No offering available')
      //   const { customerInfo } = await Purchases.purchasePackage(pkg)
      //   if (!customerInfo.entitlements.active['pro']) throw new Error('Trial not active')

      // Persist the starter wines/moments NOW — we're past the account screen,
      // so `supabase.auth.getUser()` is guaranteed to return the final user_id
      // (same one for email upgrade, new one for Google/Apple). Seeding here
      // avoids rows being orphaned under an anon user when OAuth replaces the
      // session.
      const { pickedWineKeys } = getSelections()
      if (pickedWineKeys.length > 0) {
        const existing = await getExistingMomentCount()
        if (existing === 0) {
          await seedStarterJournal(pickedWineKeys)
        }
        // If this user already has moments (e.g. signed in with another provider
        // under the same Supabase user), skip re-seeding to avoid duplicate bottles.
      }

      // Auto-claim a username from the user's email (or OAuth provider data),
      // retrying with a random suffix on collision. Runs once per signup.
      // Best-effort — don't block entry to the app if it fails.
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start trial'
      Alert.alert('Could not save your journal', msg)
    } finally {
      setPurchasing(false)
    }
  }

  const restore = async () => {
    // TODO(revenuecat): await Purchases.restorePurchases() — if entitlement active, finish onboarding.
    Alert.alert('Restore purchases', 'Not wired yet.')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={6} total={6} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroInner}>
              <Ionicons name="globe-outline" size={48} color={WINE} />
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.headline}>Your wine memories, forever.</Text>
            <Text style={styles.sub}>
              Unlimited moments. Unlimited bottles. One beautiful journal you'll still have in 10
              years.
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

          <View style={styles.priceCard}>
            <Text style={styles.priceHead}>5 days free</Text>
            <Text style={styles.priceSub}>then $5.99/month</Text>
            <Text style={styles.priceNote}>Cancel anytime in Settings.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, purchasing && styles.ctaDisabled]}
            onPress={startTrial}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {purchasing ? 'Starting…' : 'Start my 5-day free trial'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.reassure}>
            No charge today. We'll remind you 2 days before your trial ends.
          </Text>
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
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  hero: { alignItems: 'center', marginBottom: 16 },
  heroInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { alignItems: 'center', gap: 8, marginBottom: 24 },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
  },
  benefits: { gap: 10, marginBottom: 20 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  benefitIcon: { fontSize: 20 },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: WINE,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  priceHead: {
    fontSize: 28,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  priceSub: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: INK,
  },
  priceNote: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginTop: 4,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 14, gap: 10 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  reassure: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
  },
  tinyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tinyLink: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: SUBTLE,
    textDecorationLine: 'underline',
  },
  tinyDot: { fontSize: 12, color: SUBTLE },
})
