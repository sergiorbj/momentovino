import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'

import { ensureAnonymousSession } from '../../lib/session'

export default function OnboardingLayout() {
  // `ensureAnonymousSession` also runs at root `_layout` mount, but only once
  // per app launch. If the user signs out and re-enters onboarding, the root
  // effect may not run again — gate the stack on a session so every screen
  // has a valid user_id (needed for paywall / save-account).
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ensureAnonymousSession()
      .catch((err) => {
        console.error('Failed to establish anonymous session in onboarding', err)
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!sessionReady) return null

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
