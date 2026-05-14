import { useEffect, useMemo, useRef, useState } from 'react'
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
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { PasswordInput } from '../components/auth/PasswordInput'
import {
  sendPasswordResetEmail,
  updatePassword,
  verifyRecoveryOtp,
} from '../lib/auth/email'
import { queryClient } from '../lib/query-client'
import { ensureAnonymousSession } from '../lib/session'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../features/i18n/hooks'
import { requireOnline } from '../lib/connection/require-online'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

const CODE_LENGTH = 6

type Step = 'code' | 'password'

function pickParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Two-step password recovery flow:
 *  1. user enters the 6-digit OTP from the email -> `verifyRecoveryOtp`
 *  2. user picks a new password -> `updatePassword`
 *
 * No deep links / URL schemes involved. Email previewers and link scanners
 * cannot consume an OTP, so the code stays valid until expiry.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ email?: string }>()
  const initialEmail = pickParam(params.email)?.trim().toLowerCase() ?? ''

  const [step, setStep] = useState<Step>('code')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  const codeInputRef = useRef<TextInput>(null)

  useEffect(() => {
    const timer = setTimeout(() => codeInputRef.current?.focus(), 200)
    return () => clearTimeout(timer)
  }, [])

  const canSubmitCode = useMemo(
    () => /.+@.+\..+/.test(email) && code.length === CODE_LENGTH && !submitting,
    [email, code, submitting],
  )

  const canSubmitPassword = useMemo(
    () =>
      password.length >= 8 &&
      password === confirm &&
      !submitting,
    [password, confirm, submitting],
  )

  const onSubmitCode = async () => {
    if (!canSubmitCode) return
    setSubmitting(true)
    try {
      const outcome = await verifyRecoveryOtp(email, code)
      if (outcome.kind === 'success') {
        setStep('password')
        return
      }
      if (outcome.kind === 'invalid_code') {
        Alert.alert(
          t('resetPassword.codeStep.invalidCodeTitle'),
          t('resetPassword.codeStep.invalidCodeBody'),
        )
        return
      }
      Alert.alert(
        t('resetPassword.codeStep.verifyFailedTitle'),
        outcome.kind === 'error' ? outcome.message : t('resetPassword.codeStep.verifyFailedBody'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const onResendCode = async () => {
    if (!/.+@.+\..+/.test(email) || resending) return
    setResending(true)
    try {
      const outcome = await sendPasswordResetEmail(email)
      if (outcome.kind === 'success') {
        Alert.alert(
          t('resetPassword.codeStep.resentTitle'),
          t('resetPassword.codeStep.resentBody', { email }),
        )
        setCode('')
        codeInputRef.current?.focus()
        return
      }
      Alert.alert(
        t('resetPassword.codeStep.resendFailedTitle'),
        outcome.kind === 'error' ? outcome.message : t('resetPassword.codeStep.resendFailedBody'),
      )
    } finally {
      setResending(false)
    }
  }

  const onSubmitPassword = async () => {
    if (!canSubmitPassword) return
    setSubmitting(true)
    try {
      const outcome = await updatePassword(password)
      if (outcome.kind === 'success') {
        await supabase.auth.signOut()
        queryClient.clear()
        try {
          await ensureAnonymousSession()
        } catch {
          // Best-effort guest bootstrap; login will still work without it.
        }
        Alert.alert(
          t('resetPassword.passwordStep.successTitle'),
          t('resetPassword.passwordStep.successBody'),
          [
            {
              text: t('resetPassword.passwordStep.successCta'),
              onPress: () => router.replace('/login'),
            },
          ],
        )
        return
      }
      Alert.alert(
        t('resetPassword.passwordStep.updateFailedTitle'),
        outcome.kind === 'error' ? outcome.message : t('resetPassword.passwordStep.updateFailedBody'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    if (step === 'password') {
      setStep('code')
      return
    }
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
            {step === 'code' ? (
              <>
                <View style={styles.copy}>
                  <Text style={styles.headline}>{t('resetPassword.codeStep.title')}</Text>
                  <Text style={styles.sub}>
                    {t('resetPassword.codeStep.subtitlePrefix')}
                    <Text style={styles.subStrong}>
                      {email || t('resetPassword.codeStep.fallbackEmail')}
                    </Text>
                    {t('resetPassword.codeStep.subtitleSuffix')}
                  </Text>
                </View>

                <View style={styles.form}>
                  {!initialEmail ? (
                    <>
                      <Text style={styles.inputLabel}>{t('resetPassword.codeStep.emailLabel')}</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={(v) => setEmail(v.trim())}
                        placeholder={t('resetPassword.codeStep.emailPlaceholder')}
                        placeholderTextColor="#B5A6A8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                      />
                    </>
                  ) : null}

                  <Text style={styles.inputLabel}>{t('resetPassword.codeStep.codeLabel')}</Text>
                  <TextInput
                    ref={codeInputRef}
                    style={[styles.input, styles.codeInput]}
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                    placeholder={t('resetPassword.codeStep.codePlaceholder')}
                    placeholderTextColor="#B5A6A8"
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={CODE_LENGTH}
                  />

                  <TouchableOpacity
                    onPress={() => requireOnline(onResendCode)}
                    activeOpacity={0.7}
                    disabled={resending}
                    style={styles.resendLink}
                  >
                    <Text style={styles.resendText}>
                      {resending
                        ? t('resetPassword.codeStep.resendSending')
                        : t('resetPassword.codeStep.resendIdle')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.copy}>
                  <Text style={styles.headline}>{t('resetPassword.passwordStep.title')}</Text>
                  <Text style={styles.sub}>{t('resetPassword.passwordStep.subtitle')}</Text>
                </View>

                <View style={styles.form}>
                  <Text style={styles.inputLabel}>
                    {t('resetPassword.passwordStep.newPasswordLabel')}
                  </Text>
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('resetPassword.passwordStep.newPasswordPlaceholder')}
                    placeholderTextColor="#B5A6A8"
                    autoComplete="new-password"
                    textContentType="password"
                    passwordRules="minlength: 8;"
                  />
                  <Text style={styles.inputLabel}>
                    {t('resetPassword.passwordStep.confirmLabel')}
                  </Text>
                  <PasswordInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder={t('resetPassword.passwordStep.confirmPlaceholder')}
                    placeholderTextColor="#B5A6A8"
                    autoComplete="off"
                    textContentType="password"
                  />
                  {confirm.length > 0 && password !== confirm ? (
                    <Text style={styles.errorText}>
                      {t('resetPassword.passwordStep.mismatch')}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {step === 'code' ? (
              <TouchableOpacity
                style={[styles.cta, !canSubmitCode && styles.ctaDisabled]}
                onPress={() => requireOnline(onSubmitCode)}
                disabled={!canSubmitCode}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>
                  {submitting
                    ? t('resetPassword.codeStep.verifying')
                    : t('resetPassword.codeStep.continue')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.cta, !canSubmitPassword && styles.ctaDisabled]}
                onPress={() => requireOnline(onSubmitPassword)}
                disabled={!canSubmitPassword}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>
                  {submitting
                    ? t('resetPassword.passwordStep.updating')
                    : t('resetPassword.passwordStep.update')}
                </Text>
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    color: WINE,
  },
  resendLink: { alignSelf: 'center', paddingVertical: 14 },
  resendText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C2703E',
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
