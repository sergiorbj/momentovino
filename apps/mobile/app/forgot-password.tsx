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

import { sendPasswordResetEmail } from '../lib/auth/email'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const canSubmit = useMemo(
    () => /.+@.+\..+/.test(email) && !submitting,
    [email, submitting]
  )

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const outcome = await sendPasswordResetEmail(email)
      if (outcome.kind === 'success') {
        setSent(true)
        return
      }
      Alert.alert(
        'Could not send email',
        outcome.kind === 'error' ? outcome.message : 'Try again later.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/login')
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
            {sent ? (
              <View style={styles.copy}>
                <Text style={styles.headline}>Check your inbox.</Text>
                <Text style={styles.sub}>
                  We sent a password reset link to{' '}
                  <Text style={styles.subStrong}>{email.trim().toLowerCase()}</Text>. Tap the link
                  on this iPhone to choose a new password.
                </Text>
                <Text style={styles.subSmall}>
                  Don't see it? Check spam, or come back here to send it again.
                </Text>
              </View>
            ) : (
              <View style={styles.copy}>
                <Text style={styles.headline}>Reset your password.</Text>
                <Text style={styles.sub}>
                  Enter the email tied to your MomentoVino account. We'll send a link to choose a
                  new password.
                </Text>
              </View>
            )}

            {!sent ? (
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
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {sent ? (
              <TouchableOpacity
                style={styles.cta}
                onPress={() => router.replace('/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Back to sign in</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                onPress={submit}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>{submitting ? 'Sending…' : 'Send reset link'}</Text>
              </TouchableOpacity>
            )}
          </View>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  copy: { gap: 10, marginBottom: 28 },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  sub: { fontSize: 15, lineHeight: 22, fontFamily: 'DMSans_400Regular', color: INK },
  subStrong: { fontFamily: 'DMSans_700Bold', color: WINE },
  subSmall: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginTop: 6,
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
