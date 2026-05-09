import { useMemo, useState } from 'react'
import {
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

import { PasswordInput } from '../components/auth/PasswordInput'
import { AUTH_PROVIDER, createProviderAuthStyles } from '../components/auth/providerAuthStyles'
import { signInWithApple } from '../lib/auth/apple'
import { signInWithGoogle } from '../lib/auth/google'
import { signInWithEmail } from '../lib/auth/email'
import { markOnboardingCompleted } from '../features/onboarding/state'
import { resetSelections } from '../features/onboarding/selections'
import { invalidateTabCachesAndPrefetch } from '../lib/prefetch'
import { isProActive } from '../lib/purchases'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type Mode = 'buttons' | 'email'

export default function LoginScreen() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>('buttons')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => /.+@.+\..+/.test(email) && password.length >= 8 && !submitting,
    [email, password, submitting]
  )

  // After any successful sign-in: discard local onboarding selections, mark
  // onboarding done so the root layout doesn't bounce back, and route home.
  // RC.logIn(userId) was already called inside the auth lib so the entitlement
  // (if any) is now bound to the new user_id; the webhook handles TRANSFER.
  //
  // Existing users whose Pro subscription has expired must be sent to the
  // renewal paywall instead of the tabs — the boot gate in app/index.tsx only
  // fires on initial render, so we re-check entitlement here before routing.
  const afterSignIn = async () => {
    resetSelections()
    await markOnboardingCompleted()
    await invalidateTabCachesAndPrefetch(qc)
    const pro = await isProActive()
    if (!pro) {
      router.replace('/paywall')
      return
    }
    router.replace('/(tabs)/moments')
  }

  const onApple = async () => {
    if (submitting) return
    setSubmitting(true)
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
      await afterSignIn()
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogle = async () => {
    if (submitting) return
    setSubmitting(true)
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
      await afterSignIn()
    } finally {
      setSubmitting(false)
    }
  }

  const signIn = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const outcome = await signInWithEmail(email, password)
      if (outcome.kind === 'success') {
        await afterSignIn()
        return
      }
      if (outcome.kind === 'invalid_credentials') {
        Alert.alert('Wrong email or password', 'Double-check and try again, or reset your password.')
        return
      }
      if (outcome.kind === 'error') {
        Alert.alert('Sign-in failed', outcome.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const goForgot = () => router.push('/forgot-password')
  const goSignUp = () => router.replace('/onboarding')
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/onboarding')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={WINE} />
          </TouchableOpacity>
        </View>

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
              <Text style={styles.headline}>Welcome back.</Text>
              <Text style={styles.sub}>
                Sign in to pick up your journal — wines, moments, and places, right where
                you left them.
              </Text>
            </View>

            {mode === 'buttons' ? (
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.authBtn, styles.authEmail]}
                  onPress={() => setMode('email')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail-outline" size={AUTH_PROVIDER.iconSize} color="#FFFFFF" />
                  <Text style={styles.authEmailText}>Continue with email</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={[styles.authBtn, styles.authApple]}
                    onPress={onApple}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-apple" size={AUTH_PROVIDER.iconSize} color="#FFFFFF" />
                    <Text style={styles.authAppleText}>Continue with Apple</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.authBtn, styles.authGoogle]}
                  onPress={onGoogle}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-google" size={AUTH_PROVIDER.iconSize} color={INK} />
                  <Text style={styles.authGoogleText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
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
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#B5A6A8"
                  autoComplete="password"
                  textContentType="password"
                />
                <TouchableOpacity onPress={goForgot} activeOpacity={0.7} style={styles.forgotLink}>
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode('buttons')}
                  activeOpacity={0.7}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>Use another method</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={goSignUp} activeOpacity={0.7} style={styles.signUpLink}>
              <Text style={styles.signUpLinkText}>
                Don't have an account? <Text style={styles.signUpLinkStrong}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {mode === 'email' ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                onPress={signIn}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  kav: { flex: 1 },
  topBar: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 4 },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  copy: { gap: 8, marginBottom: 28 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  ...createProviderAuthStyles({ wine: WINE, ink: INK, border: BORDER }),
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
  forgotLink: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotLinkText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C2703E',
  },
  backLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  backLinkText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },
  signUpLink: { alignItems: 'center', paddingVertical: 18, marginTop: 12 },
  signUpLinkText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: INK,
  },
  signUpLinkStrong: {
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
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
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
