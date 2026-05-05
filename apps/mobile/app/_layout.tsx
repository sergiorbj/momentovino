import { Stack, router } from 'expo-router'
import { useFonts } from 'expo-font'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ensureAnonymousSession } from '../lib/session'
import { configureGoogleSignIn } from '../lib/auth/google'
import { queryClient } from '../lib/query-client'
import { prefetchCoreData } from '../lib/prefetch'
import { configurePurchases } from '../lib/purchases'
import {
  getCachedRecoveryUrl,
  initialLaunchUrlPromise,
  recoveryHref,
  subscribeRecoveryUrl,
} from '../lib/recovery-url-capture'
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
        await initialLaunchUrlPromise
        // Recovery launch will sign out + clear cache as soon as the screen
        // mounts, so don't race it by establishing a session here first.
        if (getCachedRecoveryUrl()) return

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

/**
 * Force navigation to `/reset-password` whenever a recovery URL is captured —
 * either at module load (cold start) or via a later URL event (warm launch).
 * Without this, the user can land on `/onboarding` (via `app/index.tsx`)
 * before the URL has a chance to redirect them.
 */
function RecoveryDeepLinkGuard() {
  useEffect(() => {
    return subscribeRecoveryUrl((url) => {
      router.replace(recoveryHref(url))
    })
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

  const ready = fontsLoaded || fontError

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
      <RecoveryDeepLinkGuard />
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
