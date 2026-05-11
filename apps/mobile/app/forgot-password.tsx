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
import { useTranslation } from '../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'
const BORDER = '#E8DDD4'

export default function ForgotPasswordScreen() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => /.+@.+\..+/.test(email) && !submitting,
    [email, submitting]
  )

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const target = email.trim().toLowerCase()
      const outcome = await sendPasswordResetEmail(target)
      if (outcome.kind === 'success') {
        router.replace({ pathname: '/reset-password', params: { email: target } })
        return
      }
      Alert.alert(
        t('forgotPassword.errors.sendFailedTitle'),
        outcome.kind === 'error' ? outcome.message : t('forgotPassword.errors.sendFailedBody'),
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
            <View style={styles.copy}>
              <Text style={styles.headline}>{t('forgotPassword.title')}</Text>
              <Text style={styles.sub}>{t('forgotPassword.subtitle')}</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.inputLabel}>{t('forgotPassword.emailLabel')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('forgotPassword.emailPlaceholder')}
                placeholderTextColor="#B5A6A8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>
                {submitting ? t('forgotPassword.sending') : t('forgotPassword.send')}
              </Text>
            </TouchableOpacity>
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
