import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import { hasCompletedOnboarding } from '../features/onboarding/state'
import { isProActive } from '../lib/purchases'

const WINE = '#722F37'
const BG = '#F5EBE0'

/**
 * Default landing route. Picks the next screen based on onboarding + Pro state.
 *
 * While the async checks are in flight we render a "warm splash" — a tinted
 * background that matches the native iOS launch screen plus a fade/scale-in
 * of the wine glass mark and the wordmark. This avoids the harsh flash from
 * the native splash going away to a blank `null` before redirect resolves.
 */
export default function Index() {
  const [done, setDone] = useState<boolean | null>(null)
  const [hasPro, setHasPro] = useState<boolean | null>(null)

  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.85)).current
  const wordmarkOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    hasCompletedOnboarding()
      .then(setDone)
      .catch(() => setDone(false))
    isProActive()
      .then(setHasPro)
      .catch(() => setHasPro(false))

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, scale, wordmarkOpacity])

  if (done === null || hasPro === null) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
          <Image
            source={require('../assets/glass-vino.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]}>
          MomentoVino
        </Animated.Text>
      </View>
    )
  }

  if (!done) return <Redirect href="/onboarding" />
  if (!hasPro) return <Redirect href="/paywall" />
  return <Redirect href="/(tabs)/scanner" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  logoWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    letterSpacing: 0.3,
  },
})
