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
import { hasCompletedOnboarding } from '../features/onboarding/state'
import { queryClient } from '../lib/query-client'
import { prefetchCoreDataAsync } from '../lib/prefetch'
import { configurePurchases } from '../lib/purchases'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/query-keys'

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })

  const [sessionReady, setSessionReady] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    ensureAnonymousSession()
      .then(async (userId) => {
        try {
          await configurePurchases(userId)
        } catch (err) {
          console.warn('Failed to configure RevenueCat', err)
        }
        // Keep splash until profile, moments, wines, family, invitations, and
        // entitlement are in the QueryClient cache so tabs render without a
        // second loading pass (same queries the tab screens use).
        await prefetchCoreDataAsync(queryClient)
        setSessionReady(true)
      })
      .catch((err) => {
        console.error('Failed to establish Supabase session', err)
        setSessionReady(true)
      })
  }, [])

  useEffect(() => {
    hasCompletedOnboarding()
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(false))
  }, [])

  const ready = (fontsLoaded || fontError) && sessionReady && onboardingDone !== null

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthCacheSync />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="moments" />
        <Stack.Screen name="scanner" />
        <Stack.Screen name="family" />
        <Stack.Screen name="profile" />
      </Stack>
    </QueryClientProvider>
  )
}
