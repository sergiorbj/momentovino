import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  type TextStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

import WireframeGlobe from '../../components/globe/WireframeGlobe'
import { useMomentStats } from '../../features/moments/hooks'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 1.30, 340)
const GLASS_ICON = require('../../assets/glass-vino.png')

const ANIM_DURATION = 350
const ENTER_DURATION = 500
const COUNT_DURATION = 900

function AnimatedCounter({
  value,
  animate,
  style,
}: {
  value: number
  animate: boolean
  style?: TextStyle | TextStyle[]
}) {
  const [display, setDisplay] = useState(animate ? 0 : value)
  const rafRef = useRef<number | null>(null)
  const prevValueRef = useRef(animate ? 0 : value)

  useEffect(() => {
    if (!animate) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      prevValueRef.current = value
      setDisplay(value)
      return
    }

    const from = prevValueRef.current
    const to = value
    if (from === to) {
      setDisplay(to)
      return
    }
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const t = Math.min(1, elapsed / COUNT_DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevValueRef.current = to
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, animate])

  return <Text style={style}>{display}</Text>
}

export default function MomentsScreen() {
  const globeScale = useSharedValue(1)
  const globeOpacity = useSharedValue(1)
  const animating = useRef(false)

  const contentOpacity = useSharedValue(0)
  const contentTranslate = useSharedValue(12)
  const hasAnimatedInRef = useRef(false)
  const [firstLoadDone, setFirstLoadDone] = useState(false)

  const { stats, loading, refresh } = useMomentStats()

  useEffect(() => {
    if (loading || hasAnimatedInRef.current) return
    hasAnimatedInRef.current = true
    contentOpacity.value = withTiming(1, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    })
    contentTranslate.value = withTiming(0, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    })
    const t = setTimeout(
      () => setFirstLoadDone(true),
      ENTER_DURATION + COUNT_DURATION,
    )
    return () => clearTimeout(t)
  }, [loading, contentOpacity, contentTranslate])

  useFocusEffect(
    useCallback(() => {
      globeScale.value = 1
      globeOpacity.value = 1
      animating.current = false
      refresh()
    }, [globeScale, globeOpacity, refresh])
  )

  const navigateToList = useCallback(() => {
    router.push('/moments/list')
  }, [])

  const handleGlobePress = useCallback(() => {
    if (animating.current) return
    animating.current = true

    const timingCfg = { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) }
    globeScale.value = withTiming(2.5, timingCfg)
    globeOpacity.value = withTiming(0, timingCfg, () => {
      runOnJS(navigateToList)()
    })
  }, [globeScale, globeOpacity, navigateToList])

  const globeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: globeScale.value }],
    opacity: globeOpacity.value,
  }))

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslate.value }],
  }))

  const countersAnimate = !firstLoadDone

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Moments</Text>
        </View>

        <Animated.View style={[styles.contentFill, contentAnimatedStyle]}>
          <Animated.View style={[styles.globeWrapper, globeAnimatedStyle]}>
            <WireframeGlobe
              pins={stats.pins}
              onPress={handleGlobePress}
              config={{ size: GLOBE_SIZE }}
              pinIcon={GLASS_ICON}
              pinIconScale={0.18}
            />
          </Animated.View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <AnimatedCounter
                value={stats.momentsCount}
                animate={countersAnimate}
                style={styles.statNumber}
              />
              <Text style={styles.statLabel}>Moments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedCounter
                value={stats.countriesCount}
                animate={countersAnimate}
                style={styles.statNumber}
              />
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedCounter
                value={stats.winesCount}
                animate={countersAnimate}
                style={styles.statNumber}
              />
              <Text style={styles.statLabel}>Wines</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/moments/new')}
          >
            <Text style={styles.ctaBtnText}>+ Register New Moment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EBE0' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#722F37',
  },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  contentFill: { flex: 1 },
  globeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#5C4033',
  },
  statLabel: {
    fontSize: 16,
    color: '#C2703E',
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  statDivider: {
    width: 1, height: 40,
    backgroundColor: '#E5D5C5',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  ctaBtn: {
    backgroundColor: '#5C4033',
    borderRadius: 50, height: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
