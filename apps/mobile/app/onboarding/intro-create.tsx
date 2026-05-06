import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { ProgressBar } from '../../components/onboarding/ProgressBar'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type Step = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }

const STEPS: Step[] = [
  {
    icon: 'camera-outline',
    title: 'Scan the label',
    body: "Snap or pick the bottle's label — we'll fill in the producer, region and notes for you.",
  },
  {
    icon: 'sparkles-outline',
    title: 'Write the moment',
    body: 'Add a title, the place, the date — even a photo of the night, if you have one.',
  },
  {
    icon: 'globe-outline',
    title: 'See it on your atlas',
    body: 'Your bottle gets pinned to your personal wine map. The first of many.',
  },
]

export default function IntroCreateScreen() {
  const cont = () => router.push('/onboarding/scanner-onb')

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={3} total={6} />

        <View style={styles.body}>
          <View style={styles.copy}>
            <Text style={styles.headline}>Let's add your first bottle.</Text>
            <Text style={styles.sub}>
              The journal starts with a single moment. Three quick steps and your atlas has its first pin.
            </Text>
          </View>

          <View style={styles.steps}>
            {STEPS.map((step, idx) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon} size={20} color={WINE} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>
                    {idx + 1}. {step.title}
                  </Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={cont} activeOpacity={0.85}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>Scan your first bottle</Text>
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
  copy: { gap: 10, marginBottom: 28 },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  steps: { gap: 14 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 4 },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
