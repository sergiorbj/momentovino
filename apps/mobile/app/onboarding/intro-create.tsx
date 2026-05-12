import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type StepKey = '1' | '2' | '3'
type Step = { icon: keyof typeof Ionicons.glyphMap; key: StepKey }

const STEPS: Step[] = [
  { icon: 'camera-outline', key: '1' },
  { icon: 'sparkles-outline', key: '2' },
  { icon: 'globe-outline', key: '3' },
]

export default function IntroCreateScreen() {
  const { t } = useTranslation()
  const cont = () => router.push('/onboarding/scanner-onb')

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={3} total={6} />

        <View style={styles.body}>
          <View style={styles.copy}>
            <Text style={styles.headline}>{t('onboarding.introCreate.headline')}</Text>
            <Text style={styles.sub}>{t('onboarding.introCreate.subtitle')}</Text>
          </View>

          <View style={styles.steps}>
            {STEPS.map((step, idx) => (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon} size={20} color={WINE} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>
                    {idx + 1}. {t(`onboarding.introCreate.step${step.key}Title`)}
                  </Text>
                  <Text style={styles.stepBody}>
                    {t(`onboarding.introCreate.step${step.key}Body`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={cont} activeOpacity={0.85}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>{t('onboarding.introCreate.cta')}</Text>
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
