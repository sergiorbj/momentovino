import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { hasCompletedOnboarding } from '../features/onboarding/state'
import { isProActive } from '../lib/purchases'
import { getCachedRecoveryUrl } from '../lib/recovery-url-capture'

/**
 * Default landing route. Picks the next screen based on onboarding + Pro state.
 *
 * Recovery deep links are NOT handled here — `RecoveryDeepLinkGuard` in
 * `_layout.tsx` is the single authority for `/reset-password` navigation.
 * Trying to also redirect from here caused two competing `router.replace`
 * calls that loop the native stack navigator (`Maximum update depth`).
 */
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

  // Recovery launch in flight — let the guard handle it; render nothing meanwhile.
  if (getCachedRecoveryUrl()) return null

  if (done === null || hasPro === null) return null

  if (!done) return <Redirect href="/onboarding" />
  if (!hasPro) return <Redirect href="/onboarding/paywall" />
  return <Redirect href="/(tabs)/scanner" />
}
