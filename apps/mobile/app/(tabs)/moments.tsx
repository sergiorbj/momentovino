import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  type TextStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

import WireframeGlobe from '../../components/globe/WireframeGlobe'
import { useMomentStats } from '../../features/moments/hooks'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 1.30, 340)
const GLASS_ICON = require('../../assets/glass-vino.png')

const NAV_ANIM_DURATION = 350
const ENTER_DURATION = 650
const COUNT_DURATION = 1500

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
  const navigating = useRef(false)

  const contentOpacity = useSharedValue(0)
  const contentTranslate = useSharedValue(16)
  const loadingOpacity = useSharedValue(1)
  const sway = useSharedValue(0)
  const bob = useSharedValue(0)
  const hasAnimatedInRef = useRef(false)
  const [dataReady, setDataReady] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  const [valuesVisible, setValuesVisible] = useState(false)
  const [loadingMounted, setLoadingMounted] = useState(true)

  const { stats, loading } = useMomentStats()

  useEffect(() => {
    if (!loading) setDataReady(true)
  }, [loading])

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true)
  }, [])

  const unmountLoading = useCallback(() => setLoadingMounted(false), [])

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    bob.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [sway, bob])

  useEffect(() => {
    if (hasAnimatedInRef.current) return
    if (!dataReady || !globeReady) return
    hasAnimatedInRef.current = true

    loadingOpacity.value = withTiming(
      0,
      { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(unmountLoading)()
      },
    )
    contentOpacity.value = withTiming(1, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    })
    contentTranslate.value = withTiming(0, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    })

    const revealT = setTimeout(() => setValuesVisible(true), ENTER_DURATION)
    return () => {
      clearTimeout(revealT)
    }
  }, [
    dataReady,
    globeReady,
    contentOpacity,
    contentTranslate,
    loadingOpacity,
    unmountLoading,
  ])

  useFocusEffect(
    useCallback(() => {
      globeScale.value = 1
      globeOpacity.value = 1
      navigating.current = false
    }, [globeScale, globeOpacity])
  )

  const navigateToList = useCallback(() => {
    router.push('/moments/list')
  }, [])

  const handleGlobePress = useCallback(() => {
    if (navigating.current) return
    navigating.current = true

    const timingCfg = { duration: NAV_ANIM_DURATION, easing: Easing.out(Easing.cubic) }
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

  const loadingOverlayStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }))

  const glassAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value * -6 },
      { rotate: `${sway.value * 14}deg` },
    ],
  }))

  const displayCount = (n: number) => (valuesVisible ? n : 0)

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Moments</Text>
        </View>

        <Animated.View style={[styles.contentFill, contentAnimatedStyle]}>
          <Animated.View style={[styles.globeWrapper, globeAnimatedStyle]}>
            {dataReady && (
              <WireframeGlobe
                pins={stats.pins}
                onPress={handleGlobePress}
                config={{ size: GLOBE_SIZE }}
                pinIcon={GLASS_ICON}
                pinIconScale={0.18}
                onReady={handleGlobeReady}
              />
            )}
          </Animated.View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <AnimatedCounter
                value={displayCount(stats.momentsCount)}
                animate
                style={styles.statNumber}
              />
              <Text style={styles.statLabel}>Moments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedCounter
                value={displayCount(stats.countriesCount)}
                animate
                style={styles.statNumber}
              />
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedCounter
                value={displayCount(stats.winesCount)}
                animate
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

      {loadingMounted && (
        <Animated.View
          pointerEvents="none"
          style={[styles.loadingOverlay, loadingOverlayStyle]}
        >
          <Animated.Image
            source={GLASS_ICON}
            style={[styles.loadingGlass, glassAnimStyle]}
          />
          <Text style={styles.loadingText}>Pouring your moments…</Text>
        </Animated.View>
      )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5EBE0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingGlass: {
    width: 96,
    height: 96,
    marginBottom: 24,
    resizeMode: 'contain',
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#5C4033',
    letterSpacing: 0.4,
  },
})
