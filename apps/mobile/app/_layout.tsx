import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ensureAnonymousSession } from '../lib/session'
import { configureGoogleSignIn } from '../lib/auth/google'
import { queryClient } from '../lib/query-client'
import { prefetchCoreData } from '../lib/prefetch'
import { configurePurchases } from '../lib/purchases'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/query-keys'
import { initI18n } from '../features/i18n/config'

SplashScreen.preventAutoHideAsync()

configureGoogleSignIn()

function AuthCacheSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void qc.invalidateQueries({ queryKey: queryKeys.entitlement })
      void qc.invalidateQueries({ queryKey: queryKeys.profile })
    })
    return () => data.subscription.unsubscribe()
  }, [qc])
  return null
}

/**
 * Bootstrap Supabase session + RevenueCat + tab prefetch, in the background,
 * after the splash has already been hidden. Anything the tabs need is loaded
 * here, but never blocks first paint — so a slow `signInAnonymously()` or a
 * hanging fetch can't strand the splash screen.
 */
function BackgroundBootstrap() {
  useEffect(() => {
    void (async () => {
      try {
        const userId = await ensureAnonymousSession()
        try {
          await configurePurchases(userId)
        } catch (err) {
          console.warn('Failed to configure RevenueCat', err)
        }
        prefetchCoreData(queryClient)
      } catch (err) {
        console.error('Failed to establish Supabase session', err)
      }
    })()
  }, [])
  return null
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })

  // Initialise i18next from stored override → device locale → "en" before any
  // screen renders, so first paint is in the correct language.
  const [i18nReady, setI18nReady] = useState(false)
  useEffect(() => {
    void initI18n()
      .catch((err) => console.warn('Failed to initialise i18n', err))
      .finally(() => setI18nReady(true))
  }, [])

  const ready = (fontsLoaded || fontError) && i18nReady

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthCacheSync />
      <BackgroundBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="no-connection"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="moments" />
        <Stack.Screen name="scanner" />
        <Stack.Screen name="family" />
        <Stack.Screen name="profile" />
      </Stack>
    </QueryClientProvider>
  )
}
