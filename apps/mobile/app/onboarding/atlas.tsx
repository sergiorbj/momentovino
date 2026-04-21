import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Share,
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
import WireframeGlobe from '../../components/globe/WireframeGlobe'
import type { MomentPin } from '../../components/globe/types'
import { getSelections } from '../../features/onboarding/selections'
import { getStarterWine, type StarterWine } from '../../features/onboarding/starter-deck'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 0.85, 300)
const GLASS_ICON = require('../../assets/glass-vino.png')

type Phase = 'processing' | 'reveal'

export default function AtlasScreen() {
  const selections = useRef(getSelections()).current
  const pickedStarters = useRef(
    selections.pickedWineKeys
      .map((k) => getStarterWine(k))
      .filter((s): s is StarterWine => s != null)
  ).current

  const [phase, setPhase] = useState<Phase>('processing')

  // No DB write here — this screen only previews the user's picks. The
  // actual `seedStarterJournal` call lives in paywall.startTrial so the
  // wines/moments are persisted under the authenticated user_id (post auth),
  // not the pre-auth anonymous session which may or may not survive OAuth.
  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), 1800)
    return () => clearTimeout(t)
  }, [])

  const pins: MomentPin[] = pickedStarters.map((s) => ({
    id: s.key,
    latitude: s.latitude,
    longitude: s.longitude,
    label: s.locationName,
  }))

  const countries = new Set(pickedStarters.map((s) => s.wine.country)).size

  const share = async () => {
    try {
      await Share.share({
        message: 'I just started my wine atlas on MomentoVino 🍷',
      })
    } catch {
      // ignore
    }
  }

  const cont = () => router.push('/onboarding/account')

  if (phase === 'processing') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe}>
          <ProgressBar step={4} total={6} />
          <View style={styles.processing}>
            <WireframeGlobe
              pins={pins}
              config={{ size: GLOBE_SIZE, rotationSpeed: 0.012 }}
              pinIcon={GLASS_ICON}
              pinIconScale={0.18}
            />
            <Text style={styles.processingText}>Placing your first pins…</Text>
            <ActivityIndicator color={WINE} />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.progressSlot}>
            <ProgressBar step={4} total={6} />
          </View>
          <TouchableOpacity onPress={share} style={styles.shareBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={WINE} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.revealContent} showsVerticalScrollIndicator={false}>
          <View style={styles.globeWrap}>
            <WireframeGlobe
              pins={pins}
              config={{ size: GLOBE_SIZE }}
              pinIcon={GLASS_ICON}
              pinIconScale={0.18}
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.headline}>Meet your wine atlas.</Text>
            <Text style={styles.sub}>Three moments, three places — ready for your touch.</Text>
          </View>

          <View style={styles.stats}>
            <Stat value={pickedStarters.length} label="Moments" />
            <View style={styles.statDivider} />
            <Stat value={countries} label={countries === 1 ? 'Country' : 'Countries'} />
            <View style={styles.statDivider} />
            <Stat value={pickedStarters.length} label={pickedStarters.length === 1 ? 'Wine' : 'Wines'} />
          </View>

          <View style={styles.feed}>
            {pickedStarters.map((starter, i) => (
              <MomentCard key={starter.key} index={i} starter={starter} />
            ))}
          </View>

          <Text style={styles.hint}>
            Tap any moment later to rename it, add your own photos, or remove it.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={cont} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Save my journal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function MomentCard({ index, starter }: { index: number; starter: StarterWine }) {
  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
  const title = `My ${ordinals[index] ?? `${index + 1}th`} wine moment`
  return (
    <View style={styles.momentCard}>
      <Image source={starter.image} style={styles.momentThumb} resizeMode="contain" />
      <View style={styles.momentMeta}>
        <Text style={styles.momentTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.momentWine} numberOfLines={1}>
          {starter.wine.name}
        </Text>
        <Text style={styles.momentPlace} numberOfLines={1}>
          {starter.flag}  {starter.locationName}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  progressSlot: { flex: 1 },
  shareBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  processingText: {
    fontSize: 16,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  errorHead: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
  },
  revealContent: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  copy: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    marginHorizontal: 24,
    gap: 18,
    alignSelf: 'stretch',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER,
  },
  feed: {
    alignSelf: 'stretch',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 10,
  },
  momentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 14,
  },
  momentThumb: {
    width: 44,
    height: 56,
  },
  momentMeta: { flex: 1, gap: 2 },
  momentTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
  momentWine: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  momentPlace: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 18,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
