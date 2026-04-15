import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'

import type { FamilyDashboard, FamilyMemberRow } from '../../features/family/api'
import { getFamilyDashboard } from '../../features/family/api'
import { supabase } from '../../lib/supabase'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const CTA_BG = '#5C4033'

function EmptyNoFamily({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
      </View>
      <Text style={styles.emptyTitle}>No Family Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create a family group to share your{'\n'}wine moments with loved ones
      </Text>
      <TouchableOpacity style={styles.createBtn} onPress={onCreate} activeOpacity={0.85}>
        <Text style={styles.createBtnText}>Create New Family</Text>
      </TouchableOpacity>
    </View>
  )
}

function EmptyMembersCallout() {
  return (
    <View style={styles.callout}>
      <Ionicons name="people-outline" size={22} color={WINE} />
      <Text style={styles.calloutText}>
        You are the only member so far. Invite someone to share this space.
      </Text>
    </View>
  )
}

function MemberRow({ member, isSelf }: { member: FamilyMemberRow; isSelf: boolean }) {
  const label =
    isSelf ? 'You' : member.email || member.user_id.slice(0, 8) + '…'
  const roleLabel = member.role === 'admin' ? 'Admin' : 'Member'
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Ionicons name="person" size={22} color={WINE} />
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{label}</Text>
        <Text style={styles.memberMeta}>
          {roleLabel}
          {isSelf ? ' · this device' : ''}
        </Text>
      </View>
    </View>
  )
}

export default function FamilyScreen() {
  const [dash, setDash] = useState<FamilyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Bumps on blur so in-flight fetches from a previous visit cannot overwrite state after create/back. */
  const fetchGenerationRef = useRef(0)

  const load = useCallback(async () => {
    const gen = ++fetchGenerationRef.current
    setLoadError(null)
    try {
      const { data } = await supabase.auth.getUser()
      if (gen !== fetchGenerationRef.current) return
      setSelfId(data.user?.id ?? null)
      const d = await getFamilyDashboard()
      if (gen !== fetchGenerationRef.current) return
      setDash(d)
    } catch (e) {
      console.error(e)
      if (gen !== fetchGenerationRef.current) return
      setLoadError(e instanceof Error ? e.message : 'Could not load family')
      setDash({
        family: null,
        members: [],
        pendingInvitations: [],
        isOwner: false,
      })
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setLoading(true)
      load().finally(() => {
        if (!cancelled) setLoading(false)
      })
      return () => {
        cancelled = true
        fetchGenerationRef.current += 1
        setLoading(false)
      }
    }, [load]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const hasFamily = Boolean(dash?.family)
  const soloAdmin = hasFamily && Boolean(dash?.isOwner) && (dash?.members.length ?? 0) === 1

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family</Text>
          {hasFamily && dash?.isOwner ? (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() =>
                router.push({
                  pathname: '/family/edit',
                  params: { name: dash!.family!.name },
                })
              }
            >
              <Ionicons name="settings-outline" size={20} color={WINE} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={WINE} />
          </View>
        ) : !hasFamily ? (
          <EmptyNoFamily onCreate={() => router.push('/family/create')} />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WINE} />}
          >
            <View style={styles.familyCard}>
              <View style={styles.familyBanner}>
                <Text style={styles.familyBannerEmoji}>👨‍👩‍👧‍👦</Text>
              </View>
              <View style={styles.familyCardBody}>
                <Text style={styles.familyName}>{dash!.family!.name}</Text>
                <Text style={styles.familyMeta}>
                  {dash!.members.length} member{dash!.members.length === 1 ? '' : 's'}
                  {dash!.pendingInvitations.length > 0
                    ? ` · ${dash!.pendingInvitations.length} pending invite${dash!.pendingInvitations.length === 1 ? '' : 's'}`
                    : ''}
                </Text>
              </View>
            </View>

            {soloAdmin ? <EmptyMembersCallout /> : null}

            <Text style={styles.sectionTitle}>Members ({dash!.members.length})</Text>
            <View style={styles.membersList}>
              {dash!.members.map((m, index) => (
                <View
                  key={m.id}
                  style={[styles.memberRowWrap, index < dash!.members.length - 1 && styles.memberRowBorder]}
                >
                  <MemberRow member={m} isSelf={m.user_id === selfId} />
                </View>
              ))}
            </View>

            {dash!.pendingInvitations.length > 0 && dash!.isOwner ? (
              <>
                <Text style={styles.sectionTitle}>Pending invitations</Text>
                <View style={styles.membersList}>
                  {dash!.pendingInvitations.map((inv) => (
                    <View key={inv.id} style={styles.pendingRow}>
                      <Text style={styles.memberName}>{inv.email}</Text>
                      <Text style={styles.memberMeta}>Expires {new Date(inv.expires_at).toLocaleDateString()}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {dash!.isOwner ? (
              <TouchableOpacity
                style={styles.inviteCta}
                activeOpacity={0.85}
                onPress={() => router.push('/family/invite-member')}
              >
                <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                <Text style={styles.inviteCtaText}>Invite member</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
  },
  errorBanner: {
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  errorBannerText: {
    color: '#991B1B',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createBtn: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 52,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },

  scrollView: { flex: 1, paddingHorizontal: 24 },
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  familyBanner: {
    height: 120,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyBannerEmoji: { fontSize: 52 },
  familyCardBody: { padding: 16, alignItems: 'center' },
  familyName: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    marginBottom: 4,
  },
  familyMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    textAlign: 'center',
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
    marginBottom: 12,
  },
  membersList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  memberRowWrap: {},
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EBE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#1C1C1E',
  },
  memberMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  pendingRow: { padding: 14 },
  inviteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CTA_BG,
    borderRadius: 50,
    height: 56,
    marginBottom: 24,
  },
  inviteCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
