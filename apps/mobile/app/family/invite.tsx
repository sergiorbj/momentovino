import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { acceptFamilyInvitation } from '../../features/family/api'

const WINE = '#722F37'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

export default function FamilyInviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const t = typeof token === 'string' ? token : Array.isArray(token) ? token[0] : ''
    if (!t) {
      setStatus('error')
      setMessage('Missing invitation link.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await acceptFamilyInvitation(t)
        if (cancelled) return
        setStatus('done')
        Alert.alert('Welcome', 'You have joined the family.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/family') },
        ])
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Could not accept invite')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={WINE} />
            <Text style={styles.sub}>Joining family…</Text>
          </View>
        ) : status === 'error' ? (
          <View style={styles.center}>
            <Text style={styles.title}>Could not join</Text>
            <Text style={styles.sub}>{message}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.title}>Done</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: WINE,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: { fontFamily: 'DMSans_400Regular', color: SUBTLE, textAlign: 'center', marginTop: 12 },
})
