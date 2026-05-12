import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { OptionRow } from '../../components/onboarding/OptionRow'
import { setPainPoints, type OnboardingPain } from '../../features/onboarding/selections'
import { useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const BG = '#F5EBE0'

type PainOption = { key: OnboardingPain; emoji: string }

const OPTIONS: PainOption[] = [
  { key: 'forget_names', emoji: '🤔' },
  { key: 'buried_photos', emoji: '📸' },
  { key: 'friend_asks', emoji: '💬' },
  { key: 'trip_blur', emoji: '✈️' },
]

export default function PainScreen() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<OnboardingPain>>(new Set())

  const toggle = (key: OnboardingPain) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const canContinue = selected.size > 0

  const cont = () => {
    if (!canContinue) return
    setPainPoints(Array.from(selected))
    router.push('/onboarding/intro-create')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={2} total={6} />

        <View style={styles.body}>
          <View style={styles.copy}>
            <Text style={styles.headline}>{t('onboarding.pain.headline')}</Text>
            <Text style={styles.sub}>{t('onboarding.pain.subtitle')}</Text>
          </View>

          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <OptionRow
                key={opt.key}
                mode="multi"
                emoji={opt.emoji}
                label={t(`onboarding.pain.options.${opt.key}`)}
                selected={selected.has(opt.key)}
                onPress={() => toggle(opt.key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !canContinue && styles.ctaDisabled]}
            onPress={cont}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{t('onboarding.pain.continue')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  copy: { marginBottom: 28, gap: 8 },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  options: { gap: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
