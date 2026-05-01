import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { finalizeAccount } from '../../features/onboarding/finalize-account'
import { privacyPolicyUrl, termsOfServiceUrl } from '../../lib/marketing-urls'
import { supabase } from '../../lib/supabase'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

async function loadSuggestedDisplayName(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return ''

  const meta = user.user_metadata ?? {}
  for (const key of ['full_name', 'name', 'display_name'] as const) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  if (row?.display_name?.trim()) return row.display_name.trim()

  const email = user.email
  if (email?.includes('@')) return email.split('@')[0].trim()

  return ''
}

export default function CompleteProfileScreen() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [loadingName, setLoadingName] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [legalAccepted, setLegalAccepted] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSuggestedDisplayName()
      .then((name) => {
        if (!cancelled) setDisplayName(name)
      })
      .catch(() => {
        if (!cancelled) setDisplayName('')
      })
      .finally(() => {
        if (!cancelled) setLoadingName(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canContinue = useMemo(
    () => displayName.trim().length >= 2 && legalAccepted && !busy && !loadingName,
    [displayName, legalAccepted, busy, loadingName],
  )

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url)
  }, [])

  const onContinue = async () => {
    if (!canContinue) return
    setBusy(true)
    try {
      await supabase.auth.updateUser({
        data: { terms_accepted_at: new Date().toISOString() },
      })
      await finalizeAccount({ qc, displayName: displayName.trim() })
      router.replace('/(tabs)/moments')
    } catch (err) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Could not finish setup. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={6} total={6} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copy}>
            <Text style={styles.headline}>Almost there</Text>
            <Text style={styles.sub}>
              Confirm how we should address you and accept the legal terms to finish creating your
              account.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={(t) => setDisplayName(t.slice(0, 50))}
            placeholder="How should we call you?"
            placeholderTextColor="#B5A6A8"
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            maxLength={50}
            editable={!loadingName}
          />

          <View style={styles.legalRow}>
            <View style={[styles.settingsIconWrapper, { backgroundColor: '#722F3718' }]}>
              <Ionicons name="document-text-outline" size={18} color={WINE} />
            </View>
            <View style={styles.legalCopy}>
              <Text style={styles.legalTitle}>Terms & Privacy</Text>
              <Text style={styles.legalSubtitle}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => openUrl(termsOfServiceUrl())}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.link} onPress={() => openUrl(privacyPolicyUrl())}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
            <Switch
              value={legalAccepted}
              onValueChange={setLegalAccepted}
              trackColor={{ false: '#E0D6CC', true: '#722F3780' }}
              thumbColor={legalAccepted ? WINE : '#FFFFFF'}
            />
          </View>

          {busy || loadingName ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={WINE} />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !canContinue && styles.ctaDisabled]}
            onPress={onContinue}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{busy ? 'Saving…' : 'Continue'}</Text>
          </TouchableOpacity>

          <Pressable onPress={() => router.back()} style={styles.backPress}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  copy: { gap: 10, marginBottom: 20 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: INK,
    marginBottom: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  settingsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalCopy: { flex: 1, gap: 4 },
  legalTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: INK,
  },
  legalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  link: {
    color: WINE,
    fontFamily: 'DMSans_600SemiBold',
    textDecorationLine: 'underline',
  },
  busyRow: { paddingTop: 16, alignItems: 'center' },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 12,
  },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  backPress: { alignSelf: 'center', paddingVertical: 8 },
  backText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
})
