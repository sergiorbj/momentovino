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
import { ensureAnonymousSession } from '../lib/session'
import { configureGoogleSignIn } from '../lib/auth/google'
import { hasCompletedOnboarding } from '../features/onboarding/state'

SplashScreen.preventAutoHideAsync()

configureGoogleSignIn()

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
      .then(() => setSessionReady(true))
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="moments" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="family" />
      <Stack.Screen name="profile" />
    </Stack>
  )
}
