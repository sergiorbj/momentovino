import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { OptionRow } from '../../components/onboarding/OptionRow'
import { setGoal, type OnboardingGoal } from '../../features/onboarding/selections'

const WINE = '#722F37'
const INK = '#3F2A2E'
const BG = '#F5EBE0'

type GoalOption = { key: OnboardingGoal; emoji: string; label: string }

const OPTIONS: GoalOption[] = [
  { key: 'remember', emoji: '📖', label: "Remember bottles I've loved" },
  { key: 'travels', emoji: '🌍', label: 'Build a journal of my wine travels' },
  { key: 'share', emoji: '🍷', label: 'Share wine memories with family & friends' },
  { key: 'discover', emoji: '🍇', label: 'Discover new wines worth remembering' },
]

export default function GoalScreen() {
  const [selected, setSelected] = useState<OnboardingGoal | null>(null)

  const cont = () => {
    if (!selected) return
    setGoal(selected)
    router.push('/onboarding/pain')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={1} total={6} />

        <View style={styles.body}>
          <View style={styles.copy}>
            <Text style={styles.headline}>What brings you to MomentoVino?</Text>
            <Text style={styles.sub}>We'll tailor your journal around it.</Text>
          </View>

          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <OptionRow
                key={opt.key}
                mode="single"
                emoji={opt.emoji}
                label={opt.label}
                selected={selected === opt.key}
                onPress={() => setSelected(opt.key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !selected && styles.ctaDisabled]}
            onPress={cont}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Continue</Text>
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
