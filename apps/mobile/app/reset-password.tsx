import { useEffect, useMemo, useRef, useState } from 'react'
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

import { updatePassword } from '../lib/auth/email'
import { queryClient } from '../lib/query-client'
import { ensureAnonymousSession } from '../lib/session'
import { supabase } from '../lib/supabase'

import type { Session } from '@supabase/supabase-js'

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

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const body = accessToken.split('.')[1]
    if (!body) return null
    const padded = body.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (padded.length % 4)) % 4
    const json = atob(padded + '='.repeat(padLen))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Recovery sessions include `amr` with `{ method: 'recovery' }` (GoTrue). */
function sessionLooksLikePasswordRecovery(session: Session): boolean {
  const payload = decodeJwtPayload(session.access_token)
  if (!payload) return false
  const amr = payload.amr
  if (!Array.isArray(amr)) return false
  return amr.some((entry: unknown) => {
    if (typeof entry === 'string') return entry === 'recovery'
    if (entry && typeof entry === 'object' && 'method' in entry) {
      return (entry as { method?: string }).method === 'recovery'
    }
    return false
  })
}

export default function ResetPasswordScreen() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('pending')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const appliedRecoveryFromUrlRef = useRef(false)

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
        // Drop any session (full account or anonymous) so recovery tokens are
        // not merged with an existing user — then wipe tab cache from the old user.
        await supabase.auth.signOut()
        queryClient.clear()

        const parsed = Linking.parse(url)
        const code =
          (parsed.queryParams?.code as string | undefined) ?? null
        const fragment = url.includes('#') ? url.slice(url.indexOf('#')) : ''
        const hash = parseHash(fragment)

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          appliedRecoveryFromUrlRef.current = true
        } else if (hash.access_token && hash.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.access_token,
            refresh_token: hash.refresh_token,
          })
          if (error) throw error
          appliedRecoveryFromUrlRef.current = true
        }
      } catch (err) {
        if (!cancelled) {
          setSessionStatus('failed')
          console.warn('[reset-password] could not establish recovery session', err)
        }
      }
    }

    async function applyRecoverySessionGate() {
      if (cancelled) return
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const sess = data.session
      if (!sess) {
        if (!cancelled) setSessionStatus('failed')
        return
      }
      if (appliedRecoveryFromUrlRef.current || sessionLooksLikePasswordRecovery(sess)) {
        if (!cancelled) setSessionStatus('ready')
        return
      }
      // Opened reset screen while logged in without a recovery link — clear and block.
      await supabase.auth.signOut()
      queryClient.clear()
      try {
        await ensureAnonymousSession()
      } catch {
        // ignore
      }
      if (!cancelled) setSessionStatus('failed')
    }

    async function init() {
      appliedRecoveryFromUrlRef.current = false
      const initial = await Linking.getInitialURL()
      await consumeDeepLink(initial)
      await applyRecoverySessionGate()
    }

    void init()

    const sub = Linking.addEventListener('url', (ev) => {
      void (async () => {
        appliedRecoveryFromUrlRef.current = false
        await consumeDeepLink(ev.url)
        await applyRecoverySessionGate()
      })()
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
        await supabase.auth.signOut()
        queryClient.clear()
        try {
          await ensureAnonymousSession()
        } catch {
          // Guest bootstrap is best-effort; login still works without it until next cold start.
        }
        router.replace('/login')
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
