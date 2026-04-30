import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { hasCompletedOnboarding } from '../features/onboarding/state'
import { isProActive } from '../lib/purchases'

export default function Index() {
  const [done, setDone] = useState<boolean | null>(null)
  const [hasPro, setHasPro] = useState<boolean | null>(null)

  useEffect(() => {
    hasCompletedOnboarding()
      .then(setDone)
      .catch(() => setDone(false))
    isProActive()
      .then(setHasPro)
      .catch(() => setHasPro(false))
  }, [])

  if (done === null || hasPro === null) return null

  if (!done) return <Redirect href="/onboarding" />
  if (!hasPro) return <Redirect href="/onboarding/paywall" />
  return <Redirect href="/(tabs)/scanner" />
}
