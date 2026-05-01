import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'

import { supabase } from '../lib/supabase'
import { updatePassword } from '../lib/auth/email'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type SessionStatus = 'pending' | 'ready' | 'failed'

/**
 * The recovery email opens this screen via deep link. Supabase appends auth
 * tokens either as a `?code=...` PKCE query param or as a `#access_token=...
 * &refresh_token=...&type=recovery` hash fragment depending on flow type.
 * We support both.
 */
function parseHash(hash: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of hash.replace(/^#/, '').split('&')) {
    if (!pair) continue
    const [k, v = ''] = pair.split('=')
    out[decodeURIComponent(k)] = decodeURIComponent(v)
  }
  return out
}

export default function ResetPasswordScreen() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('pending')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const canSubmit = useMemo(
    () =>
      password.length >= 8 &&
      password === confirm &&
      sessionStatus === 'ready' &&
      !submitting,
    [password, confirm, sessionStatus, submitting]
  )

  useEffect(() => {
    let cancelled = false

    async function consumeDeepLink(url: string | null) {
      if (!url) return
      try {
        const parsed = Linking.parse(url)
        const code =
          (parsed.queryParams?.code as string | undefined) ?? null
        const fragment = url.includes('#') ? url.slice(url.indexOf('#')) : ''
        const hash = parseHash(fragment)

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (hash.access_token && hash.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.access_token,
            refresh_token: hash.refresh_token,
          })
          if (error) throw error
        } else {
          // No tokens in this URL — maybe the user already has a recovery
          // session active (e.g. they navigated back). Probe it below.
        }
      } catch (err) {
        if (!cancelled) {
          setSessionStatus('failed')
          console.warn('[reset-password] could not establish recovery session', err)
        }
      }
    }

    async function init() {
      const initial = await Linking.getInitialURL()
      await consumeDeepLink(initial)

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSessionStatus(data.session ? 'ready' : 'failed')
    }

    void init()

    const sub = Linking.addEventListener('url', (ev) => {
      void consumeDeepLink(ev.url).then(async () => {
        const { data } = await supabase.auth.getSession()
        if (!cancelled) setSessionStatus(data.session ? 'ready' : 'failed')
      })
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [])

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const outcome = await updatePassword(password)
      if (outcome.kind === 'success') {
        // End the recovery session so the user signs in fresh with the
        // new password — leaves no door open if the device is shared.
        await supabase.auth.signOut()
        setDone(true)
        return
      }
      Alert.alert(
        'Could not update password',
        outcome.kind === 'error' ? outcome.message : 'Try again later.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionStatus === 'pending') {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={WINE} />
      </View>
    )
  }

  if (sessionStatus === 'failed') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.copy}>
              <Text style={styles.headline}>This link has expired.</Text>
              <Text style={styles.sub}>
                Reset links are valid for one hour. Request a new one and we'll send a fresh link
                to your inbox.
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.replace('/forgot-password')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Send a new link</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (done) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.copy}>
              <Text style={styles.headline}>Password updated.</Text>
              <Text style={styles.sub}>
                Sign in with your new password to keep going.
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.copy}>
              <Text style={styles.headline}>Choose a new password.</Text>
              <Text style={styles.sub}>
                At least 8 characters. Use something only you'd remember.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.inputLabel}>New password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#B5A6A8"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Text style={styles.inputLabel}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Type it again"
                placeholderTextColor="#B5A6A8"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              {confirm.length > 0 && password !== confirm ? (
                <Text style={styles.errorText}>Passwords don't match.</Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>{submitting ? 'Updating…' : 'Update password'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  copy: { gap: 10, marginBottom: 28 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: { fontSize: 15, lineHeight: 22, fontFamily: 'DMSans_400Regular', color: INK },
  form: { gap: 10 },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
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
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#C0392B',
    marginTop: 4,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  cta: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
