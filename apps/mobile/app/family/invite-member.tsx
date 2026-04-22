import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import type { FamilyInviteUserMatch } from '../../features/family/api'
import { inviteMemberByEmail, searchFamilyInviteTargets } from '../../features/family/api'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const CTA = '#5C4033'
const DEBOUNCE_MS = 1000

function looksLikeEmail(s: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim().toLowerCase())
}

/** Same rules as API: username only (letters, numbers, . _ -). No @, no email. */
function normalizeUsernameNeedle(s: string): string | null {
  const q = s.trim().toLowerCase()
  if (q.length < 2 || q.length > 32) return null
  if (/\s/.test(q)) return null
  if (q.includes('@')) return null
  if (!/^[a-z0-9._-]+$/.test(q)) return null
  return q
}

function isValidUserSearchQuery(s: string): boolean {
  return normalizeUsernameNeedle(s) !== null
}

function UserMatchCard({ user, onSelect }: { user: FamilyInviteUserMatch; onSelect: () => void }) {
  const label = user.display_name?.trim() || user.email
  const initial = label.charAt(0).toUpperCase() || '?'
  return (
    <TouchableOpacity style={styles.userCard} onPress={onSelect} activeOpacity={0.85}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarLetter}>{initial}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.display_name}
        </Text>
        <Text style={styles.usernameLine}>{user.username}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4B5A5" />
    </TouchableOpacity>
  )
}

export default function FamilyInviteMemberScreen() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [matches, setMatches] = useState<FamilyInviteUserMatch[]>([])
  const [searchFinished, setSearchFinished] = useState(false)
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchFormatError, setSearchFormatError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setMatches([])
      setSearchFinished(false)
      setSearching(false)
      setSearchFormatError(null)
      return
    }
    if (!isValidUserSearchQuery(debouncedSearch)) {
      setMatches([])
      setSearchFinished(true)
      setSearching(false)
      setSearchFormatError(
        'Username only: letters, numbers, dot, underscore, hyphen. No @ and no email — use invite by email below for that.',
      )
      return
    }
    setSearchFormatError(null)
    let cancelled = false
    setSearching(true)
    setSearchFinished(false)
    searchFamilyInviteTargets(debouncedSearch)
      .then((r) => {
        if (!cancelled) {
          const next = r.matches ?? []
          setMatches(next)
          if (next.length > 0) setShowEmailPanel(false)
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          setMatches([])
          Alert.alert('Search', e instanceof Error ? e.message : 'Could not search.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearching(false)
          setSearchFinished(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (searchFinished && debouncedSearch.length >= 2 && matches.length === 0 && isValidUserSearchQuery(debouncedSearch)) {
      setShowEmailPanel(true)
    }
  }, [searchFinished, debouncedSearch, matches.length])

  const runInviteByEmail = async (email: string) => {
    const e = email.trim().toLowerCase()
    if (!looksLikeEmail(e)) {
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
        Alert.alert('Invitation sent', 'We emailed them a link to join your family.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmAddExistingUser = (user: FamilyInviteUserMatch) => {
    Alert.alert(
      'Add to family?',
      `${user.display_name}\n${user.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => void runInviteByEmail(user.email),
        },
      ],
    )
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Search by username only. If they are not on MomentoVino yet, invite them by email below.
          </Text>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => {
              setShowEmailPanel(true)
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={20} color={CTA} />
            <Text style={styles.outlineBtnText}>Invite by email (no MomentoVino account yet)</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="e.g. carlossilva"
            placeholderTextColor="#A98B7E"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searchFormatError ? <Text style={styles.formatError}>{searchFormatError}</Text> : null}

          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator color={WINE} />
              <Text style={styles.searchLoadingText}>Searching users…</Text>
            </View>
          ) : null}

          {searchFinished && debouncedSearch.length >= 2 && matches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Results</Text>
              {matches.map((u) => (
                <UserMatchCard key={u.user_id} user={u} onSelect={() => confirmAddExistingUser(u)} />
              ))}
            </View>
          ) : null}

          {searchFinished &&
          debouncedSearch.length >= 2 &&
          matches.length === 0 &&
          !searching &&
          !searchFormatError ? (
            <View style={styles.notFound}>
              <Ionicons name="person-outline" size={32} color={SUBTLE} />
              <Text style={styles.notFoundTitle}>No user found</Text>
              <Text style={styles.notFoundText}>
                No account matched that username. Invite them by email below if they are not on the app yet.
              </Text>
            </View>
          ) : null}

          {showEmailPanel ? (
            <View style={styles.emailPanel}>
              <Text style={styles.sectionTitle}>Email invitation</Text>
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@example.com"
                placeholderTextColor="#A98B7E"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.cta, saving && styles.ctaDisabled]}
                onPress={() => void runInviteByEmail(inviteEmail)}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ctaText}>Send email invitation</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
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
    justifyContent: 'flex-start',
    gap: 16,
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
    fontSize: 30,
    color: WINE,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  hint: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    lineHeight: 21,
    marginBottom: 16,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CTA,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  outlineBtnText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: CTA,
  },
  label: {
    fontSize: 18,
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
    marginBottom: 12,
  },
  formatError: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#B91C1C',
    marginBottom: 12,
    lineHeight: 19,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  searchLoadingText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  section: { marginTop: 8 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatarLetter: {
    fontSize: 22,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 17,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1C1C1E',
  },
  usernameLine: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  notFound: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
    marginTop: 10,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },
  emailPanel: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8DDD4',
  },
  cta: {
    backgroundColor: CTA,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
