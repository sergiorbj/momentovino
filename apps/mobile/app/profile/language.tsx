import { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { setLanguage } from '../../features/i18n/config'
import { useLanguage, useTranslation } from '../../features/i18n/hooks'
import {
  LANGUAGE_DISPLAY,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../../features/i18n/types'
import { useUpdateSettings } from '../../features/profile/hooks'

const WINE = '#722F37'
const SUBTLE = '#6E5A5E'
const BG = '#F5EBE0'

export default function LanguageScreen() {
  const { t } = useTranslation()
  const current = useLanguage()
  const updateSettingsMutation = useUpdateSettings()
  const [pending, setPending] = useState<LanguageCode | null>(null)

  const select = async (code: LanguageCode) => {
    if (code === current || pending) return
    setPending(code)
    // Apply locally first (AsyncStorage + i18n.changeLanguage) so the UI
    // reflects the choice immediately, even if the server write fails or the
    // user is offline. Server-side persistence is best-effort.
    await setLanguage(code)
    updateSettingsMutation.mutate(
      { language: code },
      {
        onSettled: () => setPending(null),
        onError: (err) => console.warn('Failed to persist language to server', err),
      },
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('profile.language.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>{t('profile.language.subtitle')}</Text>

        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map((code, index) => {
            const display = LANGUAGE_DISPLAY[code]
            const isSelected = code === current
            const isPending = code === pending
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.row,
                  index < SUPPORTED_LANGUAGES.length - 1 && styles.rowBorder,
                ]}
                onPress={() => select(code)}
                disabled={pending !== null}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{display.flag}</Text>
                <Text style={styles.label}>{display.label}</Text>
                {isPending ? (
                  <ActivityIndicator size="small" color={WINE} />
                ) : isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={WINE} />
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: WINE,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: SUBTLE,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EBE0',
  },
  flag: {
    fontSize: 24,
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#1C1C1E',
  },
})
