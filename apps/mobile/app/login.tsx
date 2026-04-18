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

import { supabase } from '../lib/supabase'
import { markOnboardingCompleted } from '../features/onboarding/state'
import { resetSelections } from '../features/onboarding/selections'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type Mode = 'buttons' | 'email'

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('buttons')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => /.+@.+\..+/.test(email) && password.length >= 6 && !submitting,
    [email, password, submitting]
  )

  const onApple = () => {
    // TODO(auth): mirror the Apple linkIdentity flow from onboarding/account.tsx,
    // but here call supabase.auth.signInWithIdToken (no anon session to preserve).
    Alert.alert('Apple sign-in', 'Not wired yet — use email for now.')
  }

  const onGoogle = () => {
    // TODO(auth): supabase.auth.signInWithIdToken({ provider: 'google', token: id_token })
    Alert.alert('Google sign-in', 'Not wired yet — use email for now.')
  }

  const signIn = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      // If a local anonymous session exists with seeded onboarding state,
      // it'll be replaced by signInWithPassword. The user is explicitly
      // telling us they have another account, so we discard local anon work.
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      resetSelections()
      await markOnboardingCompleted()
      router.replace('/(tabs)/moments')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not sign in'
      Alert.alert('Sign-in failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const forgot = async () => {
    const target = email.trim().toLowerCase()
    if (!/.+@.+\..+/.test(target)) {
      Alert.alert('Reset password', 'Enter your email first, then tap Forgot password.')
      return
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target)
      if (error) throw error
      Alert.alert('Check your inbox', `We sent a reset link to ${target}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send reset email'
      Alert.alert('Reset password', msg)
    }
  }

  const goSignUp = () => {
    router.replace('/onboarding')
  }

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
                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={[styles.authBtn, styles.authApple]}
                    onPress={onApple}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                    <Text style={styles.authAppleText}>Continue with Apple</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.authBtn, styles.authGoogle]}
                  onPress={onGoogle}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-google" size={18} color={INK} />
                  <Text style={styles.authGoogleText}>Continue with Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authBtn, styles.authEmail]}
                  onPress={() => setMode('email')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.authEmailText}>Continue with email</Text>
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
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#B5A6A8"
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                />
                <TouchableOpacity onPress={forgot} activeOpacity={0.7} style={styles.forgotLink}>
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
  buttons: { gap: 10 },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 50,
    height: 52,
  },
  authApple: { backgroundColor: '#000000' },
  authAppleText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  authGoogle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  authGoogleText: {
    color: INK,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  authEmail: { backgroundColor: WINE },
  authEmailText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
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
