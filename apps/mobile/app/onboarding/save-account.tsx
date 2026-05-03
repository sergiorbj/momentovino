import { useMemo, useState } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { AUTH_PROVIDER, createProviderAuthStyles } from '../../components/auth/providerAuthStyles'
import { signInWithApple } from '../../lib/auth/apple'
import { signInWithGoogle } from '../../lib/auth/google'
import { signUpWithEmail } from '../../lib/auth/email'
import { finalizeAccount } from '../../features/onboarding/finalize-account'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type Mode = 'buttons' | 'email'

export default function SaveAccountScreen() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>('buttons')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmitEmail = useMemo(
    () =>
      displayName.trim().length >= 2 &&
      /.+@.+\..+/.test(email) &&
      password.length >= 8 &&
      !busy,
    [displayName, email, password, busy],
  )

  const finalizeAndEnterApp = async (name: string) => {
    try {
      await finalizeAccount({ qc, displayName: name })
      router.replace('/(tabs)/moments')
    } catch (err) {
      console.warn('[save-account] finalize failed', err)
      Alert.alert(
        'Could not finish setup',
        err instanceof Error ? err.message : 'Try again in a moment.',
      )
    }
  }

  const onApple = async () => {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await signInWithApple()
      if (outcome.kind === 'cancelled') return
      if (outcome.kind === 'unavailable') {
        Alert.alert('Continue with Apple unavailable', outcome.message)
        return
      }
      if (outcome.kind === 'error') {
        Alert.alert('Could not sign in', outcome.message)
        return
      }
      router.push('/onboarding/complete-profile')
    } finally {
      setBusy(false)
    }
  }

  const onGoogle = async () => {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await signInWithGoogle()
      if (outcome.kind === 'cancelled') return
      if (outcome.kind === 'unavailable') {
        Alert.alert('Google sign-in unavailable', outcome.message)
        return
      }
      if (outcome.kind === 'error') {
        Alert.alert('Google sign-in failed', outcome.message)
        return
      }
      router.push('/onboarding/complete-profile')
    } finally {
      setBusy(false)
    }
  }

  const onEmailSubmit = async () => {
    if (!canSubmitEmail) return
    setBusy(true)
    try {
      const trimmedName = displayName.trim()
      const outcome = await signUpWithEmail({
        email,
        password,
        fullName: trimmedName,
      })
      if (outcome.kind === 'success') {
        await finalizeAndEnterApp(trimmedName)
        return
      }
      if (outcome.kind === 'needs_email_confirmation') {
        Alert.alert(
          'Check your inbox',
          `We sent a confirmation link to ${email.trim().toLowerCase()}. Tap it to verify your email — your subscription is already saved on this account.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                void finalizeAndEnterApp(trimmedName)
              },
            },
          ]
        )
        return
      }
      if (outcome.kind === 'already_exists') {
        Alert.alert(
          'You already have an account',
          'This email is already registered. Sign in instead — your purchase will be transferred to that account on this Apple ID.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign in', onPress: () => router.replace('/login') },
          ]
        )
        return
      }
      Alert.alert(
        'Could not create account',
        outcome.kind === 'error' ? outcome.message : 'Something went wrong.',
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
              <Text style={styles.headline}>Save your wine journal.</Text>
              <Text style={styles.sub}>
                Your subscription is yours — pick how you want to sign in so we can keep your moments safe across every device.
              </Text>
            </View>

            {mode === 'buttons' ? (
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.authBtn, styles.authEmail]}
                  onPress={() => setMode('email')}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail-outline" size={AUTH_PROVIDER.iconSize} color="#FFFFFF" />
                  <Text style={styles.authEmailText}>Continue with email</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={[styles.authBtn, styles.authApple]}
                    onPress={onApple}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-apple" size={AUTH_PROVIDER.iconSize} color="#FFFFFF" />
                    <Text style={styles.authAppleText}>Continue with Apple</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.authBtn, styles.authGoogle]}
                  onPress={onGoogle}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-google" size={AUTH_PROVIDER.iconSize} color={INK} />
                  <Text style={styles.authGoogleText}>Continue with Google</Text>
                </TouchableOpacity>

                {busy ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator color={WINE} />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.form}>
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
                />
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#B5A6A8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Text style={styles.inputLabel}>Password</Text>
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
                <TouchableOpacity
                  onPress={() => setMode('buttons')}
                  activeOpacity={0.7}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>Use another method</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {mode === 'email' ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cta, !canSubmitEmail && styles.ctaDisabled]}
                onPress={onEmailSubmit}
                disabled={!canSubmitEmail}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>{busy ? 'Saving…' : 'Save my journal'}</Text>
              </TouchableOpacity>
              <Text style={styles.legal}>
                By creating an account you agree to our Terms and Privacy Policy.
              </Text>
            </View>
          ) : (
            <View style={styles.footer}>
              <Text style={styles.legal}>
                By continuing you agree to our Terms and Privacy Policy. Your subscription is already active on this Apple ID — sign in to attach it to your account.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  copy: { gap: 10, marginBottom: 24 },
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
  ...createProviderAuthStyles({ wine: WINE, ink: INK, border: BORDER }),
  busyRow: {
    paddingTop: 12,
    alignItems: 'center',
  },
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
  backLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  backLinkText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
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
  legal: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
})
