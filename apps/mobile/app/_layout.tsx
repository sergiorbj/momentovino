import { Slot } from 'expo-router'
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
import '../global.css'
import { ensureAnonymousSession } from '../lib/session'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })

  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    ensureAnonymousSession()
      .then(() => setSessionReady(true))
      .catch((err) => {
        console.error('Failed to establish Supabase session', err)
        setSessionReady(true)
      })
  }, [])

  useEffect(() => {
    if ((fontsLoaded || fontError) && sessionReady) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError, sessionReady])

  if ((!fontsLoaded && !fontError) || !sessionReady) {
    return null
  }

  return <Slot />
}
