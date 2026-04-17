import { useMemo } from 'react'
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'

import WireframeGlobe from '../../components/globe/WireframeGlobe'
import type { MomentPin } from '../../components/globe/types'
import { resetSelections } from '../../features/onboarding/selections'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 1.1, 320)

const WELCOME_PINS: MomentPin[] = [
  { id: '1', latitude: 48.86, longitude: 2.35, label: 'Paris' },
  { id: '2', latitude: 41.9, longitude: 12.5, label: 'Rome' },
  { id: '3', latitude: -32.89, longitude: -68.84, label: 'Mendoza' },
  { id: '4', latitude: 41.15, longitude: -8.61, label: 'Porto' },
  { id: '5', latitude: 38.5, longitude: -122.27, label: 'Napa Valley' },
  { id: '6', latitude: -34.53, longitude: 138.95, label: 'Barossa' },
  { id: '7', latitude: -33.93, longitude: 18.86, label: 'Stellenbosch' },
  { id: '8', latitude: 36.4, longitude: 25.46, label: 'Santorini' },
  { id: '9', latitude: 42.25, longitude: -2.5, label: 'Rioja' },
  { id: '10', latitude: 35.68, longitude: 139.76, label: 'Tokyo' },
  { id: '11', latitude: 44.84, longitude: -0.58, label: 'Bordeaux' },
  { id: '12', latitude: 43.77, longitude: 11.26, label: 'Tuscany' },
  { id: '13', latitude: 49.26, longitude: 4.03, label: 'Champagne' },
  { id: '14', latitude: 45.3, longitude: -123.0, label: 'Willamette' },
  { id: '15', latitude: -41.52, longitude: 173.96, label: 'Marlborough' },
  { id: '16', latitude: 49.99, longitude: 7.0, label: 'Mosel' },
  { id: '17', latitude: -34.64, longitude: -71.39, label: 'Colchagua' },
  { id: '18', latitude: -33.95, longitude: 115.07, label: 'Margaret River' },
  { id: '19', latitude: -29.17, longitude: -51.52, label: 'Vale dos Vinhedos' },
  { id: '20', latitude: 38.47, longitude: 106.22, label: 'Ningxia' },
  { id: '21', latitude: -9.39, longitude: -40.52, label: 'Vale do São Francisco' },
  { id: '22', latitude: -30.89, longitude: -55.54, label: 'Campanha Gaúcha' },
  { id: '23', latitude: 33.89, longitude: -5.55, label: 'Meknes' },
]

const GLASS_ICON = require('../../assets/glass-vino.png')

export default function WelcomeScreen() {
  const pins = useMemo(() => WELCOME_PINS, [])

  const startFlow = () => {
    resetSelections()
    router.push('/onboarding/goal')
  }

  const goLogin = () => {
    resetSelections()
    router.push('/onboarding/account?mode=login')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.brand}>MomentoVino</Text>
        </View>

        <View style={styles.globeWrap}>
          <WireframeGlobe
            pins={pins}
            config={{ size: GLOBE_SIZE }}
            pinIcon={GLASS_ICON}
            pinIconScale={0.18}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>
            Your travels-through-wine, one beautiful journal.
          </Text>
          <Text style={styles.sub}>
            Scan a label, pin the moment, keep the memory forever.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={startFlow} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Get started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goLogin} activeOpacity={0.7} style={styles.loginWrap}>
            <Text style={styles.loginText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  brand: {
    fontSize: 26,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    letterSpacing: 0.5,
  },
  globeWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: {
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 6,
  },
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
  loginWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginText: {
    color: SUBTLE,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
})
