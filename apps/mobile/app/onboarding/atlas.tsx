import { useEffect, useRef, useState } from 'react'
import {
  Animated,
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
import * as StoreReview from 'expo-store-review'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import WireframeGlobe from '../../components/globe/WireframeGlobe'
import type { MomentPin } from '../../components/globe/types'
import {
  getCapture,
  type CapturedMoment,
  type CapturedWine,
} from '../../features/onboarding/onboarding-capture'
import { useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 0.85, 300)
const GLASS_SIZE = 260

type Phase = 'processing' | 'reveal'

export default function AtlasScreen() {
  const { t } = useTranslation()
  // Snapshot once — capture state lives in a module-level singleton, but the
  // user could in theory tap-back into this screen and we want the same data.
  const capture = useRef(getCapture()).current
  const wine = capture.wine
  const moment = capture.moment

  const [phase, setPhase] = useState<Phase>('processing')

  useEffect(() => {
    if (!wine || !moment) {
      router.replace('/onboarding/intro-create')
    }
  }, [wine, moment])

  const loadingPhrases = [
    t('onboarding.atlas.loadingPreferences'),
    t('onboarding.atlas.loadingMoment'),
    t('onboarding.atlas.loadingJournal'),
  ]

  useEffect(() => {
    if (phase !== 'reveal') return
    const t = setTimeout(async () => {
      try {
        if (await StoreReview.isAvailableAsync()) {
          await StoreReview.requestReview()
        }
      } catch {}
    }, 3000)
    return () => clearTimeout(t)
  }, [phase])

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
        message: t('onboarding.atlas.shareMessage'),
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
            <SwayingGlass />
            <TypewriterPhrases
              phrases={loadingPhrases}
              onComplete={() => setPhase('reveal')}
            />
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
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.headline}>{t('onboarding.atlas.headline')}</Text>
            <Text style={styles.sub}>{t('onboarding.atlas.subtitle')}</Text>
          </View>

          <View style={styles.feed}>
            <MomentCard moment={moment} wine={wine} />
          </View>

          <Text style={styles.hint}>{t('onboarding.atlas.hint')}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={cont} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{t('onboarding.atlas.cta')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function SwayingGlass() {
  const sway = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 1400, useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [sway])

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-6deg', '6deg'],
  })

  return (
    <Animated.View style={[styles.glassWrap, { transform: [{ rotate }] }]}>
      <Image
        source={require('../../assets/glass-vino.png')}
        style={styles.glassImg}
        resizeMode="contain"
      />
    </Animated.View>
  )
}

function TypewriterPhrases({
  phrases,
  onComplete,
}: {
  phrases: string[]
  onComplete: () => void
}) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [mode, setMode] = useState<'typing' | 'pausing' | 'erasing'>('typing')
  const completedRef = useRef(false)

  useEffect(() => {
    const current = phrases[phraseIndex]
    if (!current) return

    if (mode === 'typing') {
      if (text.length >= current.length) {
        const tid = setTimeout(() => setMode('pausing'), 310)
        return () => clearTimeout(tid)
      }
      const tid = setTimeout(() => setText(current.slice(0, text.length + 1)), 20)
      return () => clearTimeout(tid)
    }

    if (mode === 'pausing') {
      const isLast = phraseIndex === phrases.length - 1
      if (isLast) {
        const tid = setTimeout(() => {
          if (completedRef.current) return
          completedRef.current = true
          onComplete()
        }, 200)
        return () => clearTimeout(tid)
      }
      const tid = setTimeout(() => setMode('erasing'), 250)
      return () => clearTimeout(tid)
    }

    if (mode === 'erasing') {
      if (text.length === 0) {
        setPhraseIndex((i) => i + 1)
        setMode('typing')
        return
      }
      const tid = setTimeout(() => setText(text.slice(0, -1)), 11)
      return () => clearTimeout(tid)
    }
  }, [text, mode, phraseIndex, phrases, onComplete])

  return <Text style={styles.typewriterText}>{text}</Text>
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
    padding: 24,
  },
  glassWrap: {
    width: GLASS_SIZE,
    height: GLASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassImg: {
    width: '100%',
    height: '100%',
  },
  typewriterText: {
    fontSize: 18,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
    minHeight: 26,
    paddingHorizontal: 20,
    marginTop: -50,
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
