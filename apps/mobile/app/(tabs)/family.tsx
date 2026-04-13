import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'

const MEMBERS = [
  { id: 1, name: 'Carlos Silva', role: 'Admin', moments: 23, emoji: '👨' },
  { id: 2, name: 'Maria Silva', role: 'Member', moments: 18, emoji: '👩' },
  { id: 3, name: 'Pedro Silva', role: 'Member', moments: 4, emoji: '👦' },
  { id: 4, name: 'Ana Silva', role: 'Member', moments: 2, emoji: '👧' },
]

function EmptyFamily({ onCreate }: { onCreate: () => void }) {
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

function FamilyGroup() {
  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Family card */}
      <View style={styles.familyCard}>
        <View style={styles.familyBanner}>
          <Text style={styles.familyBannerEmoji}>👨‍👩‍👧‍👦</Text>
        </View>
        <View style={styles.familyCardBody}>
          <Text style={styles.familyName}>Silva Family</Text>
          <Text style={styles.familyMeta}>Created Jan 2024 · 47 moments shared</Text>
        </View>
      </View>

      {/* Members */}
      <Text style={styles.sectionTitle}>Members (4)</Text>
      <View style={styles.membersList}>
        {MEMBERS.map((member, index) => (
          <TouchableOpacity
            key={member.id}
            style={[styles.memberRow, index < MEMBERS.length - 1 && styles.memberRowBorder]}
            activeOpacity={0.7}
          >
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarEmoji}>{member.emoji}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberMeta}>
                {member.role} · {member.moments} moments
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C2703E" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Invite */}
      <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={18} color="#722F37" />
        <Text style={styles.inviteBtnText}>Invite Member</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

export default function FamilyScreen() {
  const [hasFamily, setHasFamily] = useState(true)

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#722F37" />
          </TouchableOpacity>
        </View>

        {hasFamily ? <FamilyGroup /> : <EmptyFamily onCreate={() => setHasFamily(true)} />}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EBE0' },
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
    color: '#722F37',
  },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#722F37',
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
    backgroundColor: '#722F37',
    borderRadius: 50, height: 52,
    paddingHorizontal: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },

  // Family group
  scrollView: { flex: 1, paddingHorizontal: 24 },
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
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
    color: '#722F37',
    marginBottom: 4,
  },
  familyMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#C2703E',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: '#722F37',
    marginBottom: 12,
  },
  membersList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5EBE0',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarEmoji: { fontSize: 24 },
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
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 50, height: 48,
    borderWidth: 1.5,
    borderColor: '#722F37',
    marginBottom: 16,
  },
  inviteBtnText: {
    color: '#722F37',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
})
