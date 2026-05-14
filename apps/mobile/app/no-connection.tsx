import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import NetInfo from '@react-native-community/netinfo'

import { useTranslation } from '../features/i18n/hooks'
import { consumePendingAction, clearPendingAction } from '../lib/connection/require-online'

const WINE = '#722F37'
const INK = '#3F2A2E'
const BG = '#F5EBE0'
const ACCENT = '#C2703E'

const RETRY_VISIBLE_MS = 1500

export default function NoConnectionScreen() {
  const { t } = useTranslation()
  const [retrying, setRetrying] = useState(false)
  const spin = useRef(new Animated.Value(0)).current
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        const action = consumePendingAction()
        if (router.canGoBack()) router.back()
        else router.replace('/(tabs)/moments')
        if (action) void action()
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!retrying) {
      spinLoopRef.current?.stop()
      spin.setValue(0)
      return
    }
    spin.setValue(0)
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    spinLoopRef.current = loop
    loop.start()
    return () => loop.stop()
  }, [retrying, spin])

  const onClose = () => {
    clearPendingAction()
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/moments')
  }

  const onRetry = async () => {
    if (retrying) return
    setRetrying(true)
    const startedAt = Date.now()
    try {
      const state = await NetInfo.fetch()
      const elapsed = Date.now() - startedAt
      if (elapsed < RETRY_VISIBLE_MS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_VISIBLE_MS - elapsed))
      }
      if (!state.isConnected || state.isInternetReachable === false) return
      const action = consumePendingAction()
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)/moments')
      if (action) await action()
    } finally {
      setRetrying(false)
    }
  }

  const onOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:')
    } else {
      Linking.openSettings()
    }
  }

  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('noConnection.close')}
          >
            <Ionicons name="close" size={26} color={INK} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCluster}>
            <Image
              source={require('../assets/glass.png')}
              style={styles.glassIcon}
              resizeMode="contain"
            />
            <View style={styles.cloudBadge}>
              <Ionicons name="cloud-offline" size={26} color={INK} />
            </View>
          </View>

          <Text style={styles.headline}>{t('noConnection.title')}</Text>
          <Text style={styles.body}>{t('noConnection.body')}</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('noConnection.waiting')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.retryBtn, retrying && styles.retryBtnDisabled]}
            onPress={onRetry}
            activeOpacity={0.9}
            disabled={retrying}
          >
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.retryText}>
              {retrying ? t('noConnection.retrying') : t('noConnection.retry')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenSettings} activeOpacity={0.7}>
            <Text style={styles.settingsLink}>{t('noConnection.openSettings')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconCluster: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  glassIcon: {
    width: 140,
    height: 140,
    tintColor: WINE,
  },
  cloudBadge: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 30,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  body: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: ACCENT,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 14,
    alignItems: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: WINE,
    borderRadius: 999,
    paddingVertical: 16,
  },
  retryBtnDisabled: {
    opacity: 0.7,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  settingsLink: {
    color: WINE,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    paddingVertical: 6,
  },
})
