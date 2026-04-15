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

import { inviteMemberByEmail } from '../../features/family/api'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

export default function FamilyInviteMemberScreen() {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e = email.trim().toLowerCase()
    if (!e || !e.includes('@')) {
      Alert.alert('Email', 'Enter a valid email address.')
      return
    }
    try {
      setSaving(true)
      const out = await inviteMemberByEmail(e)
      if ('addedMember' in out && out.addedMember) {
        Alert.alert('Member added', 'They already had an account and were added to your family.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('Invitation sent', 'We sent an email with a link to join your family.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Invite failed')
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
          <Text style={styles.title}>Invite member</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="friend@example.com"
            placeholderTextColor="#A98B7E"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
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
              <Text style={styles.ctaText}>Send invite</Text>
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
