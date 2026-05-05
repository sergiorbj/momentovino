import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { hasCompletedOnboarding } from '../features/onboarding/state'
import { isProActive } from '../lib/purchases'
import {
  initialLaunchUrlPromise,
  isPasswordRecoveryDeepLink,
  recoveryHref,
} from '../lib/recovery-url-capture'

type RecoveryHref = string | null

export default function Index() {
  // Wait for the ONE shared `getInitialURL` result before routing — otherwise a
  // second `getInitialURL` call returns null and we wrongly send recovery users
  // to onboarding.
  const [recovery, setRecovery] = useState<RecoveryHref | undefined>(undefined)
  const [done, setDone] = useState<boolean | null>(null)
  const [hasPro, setHasPro] = useState<boolean | null>(null)

  useEffect(() => {
    initialLaunchUrlPromise
      .then((url) => {
        if (isPasswordRecoveryDeepLink(url)) setRecovery(recoveryHref(url))
        else setRecovery(null)
      })
      .catch(() => setRecovery(null))

    hasCompletedOnboarding()
      .then(setDone)
      .catch(() => setDone(false))
    isProActive()
      .then(setHasPro)
      .catch(() => setHasPro(false))
  }, [])

  if (recovery === undefined) return null
  if (recovery) return <Redirect href={recovery as never} />

  if (done === null || hasPro === null) return null

  if (!done) return <Redirect href="/onboarding" />
  if (!hasPro) return <Redirect href="/onboarding/paywall" />
  return <Redirect href="/(tabs)/scanner" />
}
