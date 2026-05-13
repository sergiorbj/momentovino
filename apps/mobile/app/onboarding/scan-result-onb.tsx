import { useEffect } from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { getCapture } from '../../features/onboarding/onboarding-capture'
import { useTranslation, wineTypeLabel } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const BROWN = '#5C4033'

export default function OnboardingScanResultScreen() {
  const { t } = useTranslation()
  const wine = getCapture().wine

  // Stale navigation (capture was reset). Send the user back to start a fresh scan.
  useEffect(() => {
    if (!wine) router.replace('/onboarding/scanner-onb')
  }, [wine])

  if (!wine) return null

  const cont = () => router.push('/onboarding/new-moment-onb')

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('onboarding.scanResult.title')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.heroWrap}>
            {wine.labelPhoto ? (
              <Image
                source={{ uri: wine.labelPhoto.uri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Image
                  source={require('../../assets/glass.png')}
                  style={styles.heroPlaceholderIcon}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          <Text style={styles.wineName} numberOfLines={2}>
            {wine.name}
          </Text>

          {wine.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {wine.description}
            </Text>
          ) : null}

          <View style={styles.card}>
            {wine.producer ? (
              <InfoRow label={t('onboarding.scanResult.labels.producer')} value={wine.producer} />
            ) : null}
            <InfoRow
              label={t('onboarding.scanResult.labels.region')}
              value={wine.region?.trim() ? wine.region : t('onboarding.scanResult.notSet')}
            />
            <InfoRow
              label={t('onboarding.scanResult.labels.country')}
              value={wine.country?.trim() ? wine.country : t('onboarding.scanResult.notSet')}
            />
            {wine.type ? (
              <InfoRow
                label={t('onboarding.scanResult.labels.type')}
                value={wineTypeLabel(wine.type, t)}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={cont}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>{t('onboarding.scanResult.createMoment')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: WINE,
  },
  body: { flex: 1, padding: 20, alignItems: 'center' },
  heroWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 280,
    aspectRatio: 0.75,
    backgroundColor: '#FDF2F4',
    height: '58%',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    width: 56,
    height: 56,
    tintColor: WINE,
  },
  wineName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: BROWN,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: SUBTLE,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: INK,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
