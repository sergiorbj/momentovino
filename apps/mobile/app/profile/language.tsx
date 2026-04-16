import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { getProfile, updateSettings } from '../../features/profile/api'

const WINE = '#722F37'
const BG = '#F5EBE0'

type Lang = 'en' | 'pt-BR'

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English (US)', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Portugues (BR)', flag: '🇧🇷' },
]

export default function LanguageScreen() {
  const [current, setCurrent] = useState<Lang>('en')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { profile } = await getProfile()
        setCurrent(profile.language)
      } catch (e) {
        console.warn('Failed to load language', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const select = async (lang: Lang) => {
    if (lang === current) return
    setSaving(true)
    try {
      const { profile } = await updateSettings({ language: lang })
      setCurrent(profile.language)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not change language')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.title}>Language</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={WINE} />
          </View>
        ) : (
          <View style={styles.list}>
            {LANGUAGES.map((lang, index) => {
              const isSelected = lang.code === current
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.row, index < LANGUAGES.length - 1 && styles.rowBorder]}
                  onPress={() => select(lang.code)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={styles.label}>{lang.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={WINE} />}
                </TouchableOpacity>
              )
            })}
            {saving && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="small" color={WINE} />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    fontSize: 22,
    color: WINE,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
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
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
})
