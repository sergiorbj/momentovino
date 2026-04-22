import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
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

import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { supabase } from '../../lib/supabase'
import { isAccountAlreadyExistsAuthError } from '../../lib/auth/registrationErrors'
import { getExistingMomentCount } from '../../lib/auth/returningUser'
import { signInWithGoogle } from '../../lib/auth/google'
import { markOnboardingCompleted } from '../../features/onboarding/state'
import { getSelections, resetSelections } from '../../features/onboarding/selections'
import { getStarterWine, type StarterWine } from '../../features/onboarding/starter-deck'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

type Mode = 'buttons' | 'email'

export default function AccountScreen() {
  const picked = useRef<StarterWine[]>(
    getSelections()
      .pickedWineKeys.map((k) => getStarterWine(k))
      .filter((s): s is StarterWine => s != null)
  ).current

  const [mode, setMode] = useState<Mode>('buttons')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () =>
      displayName.trim().length >= 2 &&
      /.+@.+\..+/.test(email) &&
      password.length >= 6 &&
      !submitting,
    [displayName, email, password, submitting]
  )

  // NOTE: `signInWithIdToken` replaces the anonymous session with the OAuth
  // user. Any DB rows already written under the anon user_id become orphaned.
  // Today the starter wines/moments are only in local state (see getSelections)
  // and are persisted to the DB AFTER the paywall, so there is nothing to
  // migrate. If we ever write to the DB before this screen, add a server-side
  // merge (edge function or trigger on auth.users) to re-assign those rows.
  const finishAsReturningUserWithJournal = () => {
    Alert.alert(
      'You already have an account',
      'We found wine moments from this sign-in. We will open your journal and will not add duplicate starter entries.',
      [
        {
          text: 'OK',
          onPress: () => {
            void (async () => {
              await markOnboardingCompleted()
              resetSelections()
              router.replace('/(tabs)/moments')
            })()
          },
        },
      ]
    )
  }

  const onGoogle = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const outcome = await signInWithGoogle()
      if (outcome.kind === 'success') {
        const existing = await getExistingMomentCount()
        if (existing > 0) {
          finishAsReturningUserWithJournal()
          return
        }
        router.push('/onboarding/paywall')
        return
      }
      if (outcome.kind === 'cancelled') return
      if (outcome.kind === 'unavailable') {
        Alert.alert('Google sign-in unavailable', outcome.message)
        return
      }
      Alert.alert('Google sign-in failed', outcome.message)
    } finally {
      setSubmitting(false)
    }
  }

  const upgradeWithEmail = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const trimmedEmail = email.trim().toLowerCase()
      const trimmedName = displayName.trim()

      // Prefer `updateUser` when there's an anonymous session, so the
      // user_id stays stable and no orphan rows are created. Fall back to
      // `signUp` if there's no session at all (e.g., the user just signed
      // out in this app run and the onboarding-layout guard happened to
      // fail to create a fresh anon session).
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session?.user) {
        const { error } = await supabase.auth.updateUser({
          email: trimmedEmail,
          password,
          data: { full_name: trimmedName },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: trimmedName } },
        })
        if (error) throw error
      }

      // Persist display_name directly to public.profiles. The `handle_new_user`
      // trigger only fires on auth.users INSERT, so `updateUser` above won't
      // populate the profile; we write it ourselves under RLS (users can
      // update their own profile row).
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (userId) {
        await supabase
          .from('profiles')
          .update({ display_name: trimmedName })
          .eq('id', userId)
      }

      const existing = await getExistingMomentCount()
      if (existing > 0) {
        finishAsReturningUserWithJournal()
        return
      }
      router.push('/onboarding/paywall')
    } catch (err) {
      if (isAccountAlreadyExistsAuthError(err)) {
        Alert.alert(
          'You already have an account',
          'This email is already registered. Please sign in from the login screen using the same method you used before, or with email and your password.',
        )
        return
      }
      const msg = err instanceof Error ? err.message : 'Could not create account'
      Alert.alert('Account creation failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <ProgressBar step={5} total={6} />

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.shelf}>
              {picked.map((s) => (
                <View key={s.key} style={styles.shelfCard}>
                  <Image source={s.image} style={styles.shelfImg} resizeMode="contain" />
                </View>
              ))}
            </View>

            <View style={styles.copy}>
              <Text style={styles.headline}>Save your journal.</Text>
              <Text style={styles.sub}>
                Your {picked.length} moments are ready. Create a free account so they're yours
                forever — on this phone, your next phone, and shared with whoever you choose.
              </Text>
            </View>

            {mode === 'buttons' ? (
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.authBtn, styles.authGoogle]}
                  onPress={onGoogle}
                  disabled={submitting}
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
                  placeholder="At least 6 characters"
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

            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>I already have an account</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              By continuing you agree to our Terms and Privacy Policy.
            </Text>
          </ScrollView>

          {mode === 'email' ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                onPress={upgradeWithEmail}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>
                  {submitting ? 'Saving…' : 'Save my journal'}
                </Text>
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
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  shelf: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  shelfCard: {
    width: 70,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfImg: { width: '100%', height: '100%' },
  copy: { gap: 8, marginBottom: 24 },
  headline: {
    fontSize: 26,
    lineHeight: 32,
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
    fontSize: 16,
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
  loginLink: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C2703E',
  },
  legal: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
    paddingHorizontal: 16,
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
