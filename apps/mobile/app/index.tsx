import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { hasCompletedOnboarding } from '../features/onboarding/state'

export default function Index() {
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    hasCompletedOnboarding()
      .then(setDone)
      .catch(() => setDone(false))
  }, [])

  if (done === null) return null
  return <Redirect href={done ? '/(tabs)/scanner' : '/onboarding'} />
}
