import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { createFamily } from '../../features/family/api'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

export default function FamilyCreateScreen() {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const n = name.trim()
    if (n.length < 2) {
      Alert.alert('Name required', 'Enter at least 2 characters.')
      return
    }
    try {
      setSaving(true)
      await createFamily(n)
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create family')
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
          <Text style={styles.title}>New family</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>Family name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Silva family"
            placeholderTextColor="#A98B7E"
            style={styles.input}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.cta, saving && styles.ctaDisabled]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>Create family</Text>
            )}
          </TouchableOpacity>
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
    fontSize: 22,
    color: WINE,
  },
  body: { flex: 1, padding: 24 },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: '#5C4033',
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
