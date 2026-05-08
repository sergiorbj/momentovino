import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import {
  getCapture,
  type CapturedMoment,
  type CapturedWine,
} from '../../features/onboarding/onboarding-capture'

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
  // Snapshot once — capture state lives in a module-level singleton, but the
  // user could in theory tap-back into this screen and we want the same data.
  const capture = useRef(getCapture()).current
  const wine = capture.wine
  const moment = capture.moment

  const [phase, setPhase] = useState<Phase>('processing')

  useEffect(() => {
    if (!wine || !moment) {
      router.replace('/onboarding/intro-create')
      return
    }
    const t = setTimeout(() => setPhase('reveal'), 1800)
    return () => clearTimeout(t)
  }, [wine, moment])

  if (!wine || !moment) return null

  const pin: MomentPin = {
    id: 'onboarding-1',
    latitude: moment.latitude,
    longitude: moment.longitude,
    label: moment.locationName,
  }
  const pins: MomentPin[] = [pin]

  const share = async () => {
    try {
      await Share.share({
        message: 'I just started my wine atlas on MomentoVino 🍷',
      })
    } catch {
      // ignore
    }
  }

  const cont = () => router.push('/onboarding/paywall')

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
            <Text style={styles.processingText}>Pinning your first memory…</Text>
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

        <View style={styles.revealContent}>
          <View style={styles.globeWrap}>
            <WireframeGlobe
              pins={pins}
              config={{ size: GLOBE_SIZE }}
              pinIcon={GLASS_ICON}
              pinIconScale={0.18}
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.headline}>Your first memory is on your atlas.</Text>
            <Text style={styles.sub}>One bottle, one place — the start of your journal.</Text>
          </View>

          <View style={styles.feed}>
            <MomentCard moment={moment} wine={wine} />
          </View>

          <Text style={styles.hint}>
            Tap your moment later to add photos, edit details, or share it with family.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={cont} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Save my journal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function MomentCard({ moment, wine }: { moment: CapturedMoment; wine: CapturedWine }) {
  const cover = moment.photos.find((p) => p.isCover) ?? moment.photos[0]
  const thumbUri = cover?.uri ?? wine.labelPhoto?.uri ?? null
  return (
    <View style={styles.momentCard}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.momentThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.momentThumb, styles.momentThumbPlaceholder]}>
          <Ionicons name="wine-outline" size={20} color={WINE} />
        </View>
      )}
      <View style={styles.momentMeta}>
        <Text style={styles.momentTitle} numberOfLines={1}>
          {moment.title}
        </Text>
        <Text style={styles.momentWine} numberOfLines={1}>
          {wine.name}
        </Text>
        <Text style={styles.momentPlace} numberOfLines={1}>
          {moment.locationName}
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
  revealContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  globeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
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
    borderRadius: 8,
    backgroundColor: '#F5EBE0',
  },
  momentThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 14,
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
