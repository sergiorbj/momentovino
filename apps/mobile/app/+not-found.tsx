import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { queryClient } from '../lib/query-client'
import { supabase } from '../lib/supabase'

const BG = '#F5EBE0'
const WINE = '#722F37'
const INK = '#3F2A2E'

/**
 * Invalid deep links / unknown routes used to leave a stale stack: “Go back”
 * could return to `index` while `BackgroundBootstrap` had already created an
 * anonymous session, so the user landed in the app as guest. We clear anon +
 * React Query, then `replace` so there is nothing sensible to pop back to.
 */
export default function NotFoundScreen() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      const isAnonymous = !!user?.is_anonymous

      if (isAnonymous) {
        await supabase.auth.signOut()
        queryClient.clear()
      } else if (!user) {
        queryClient.clear()
      }

      if (cancelled) return

      if (user && !isAnonymous) {
        router.replace('/(tabs)/moments')
        return
      }

      router.replace('/onboarding')
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <View style={styles.container}>
      <ActivityIndicator color={WINE} />
      <Text style={styles.hint}>Taking you to MomentoVino…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  hint: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
  },
})
