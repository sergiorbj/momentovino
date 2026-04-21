import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'

import {
  getProfile,
  updateSettings,
  type ProfileRow,
  type ProfileStats,
} from '../../features/profile/api'
import { supabase } from '../../lib/supabase'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const WINE = '#722F37'
const BG = '#F5EBE0'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ moments: 0, wines: 0, family: 0 })
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      const data = await getProfile()
      setProfile(data.profile)
      setStats(data.stats)
    } catch (e) {
      console.warn('Failed to load profile', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const toggleNotifications = async (value: boolean) => {
    if (!profile) return
    const previous = profile.notifications_enabled
    setProfile({ ...profile, notifications_enabled: value })
    try {
      await updateSettings({ notifications_enabled: value })
    } catch (e) {
      setProfile((p) => (p ? { ...p, notifications_enabled: previous } : p))
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update notifications')
    }
  }

  const signOut = () => {
    Alert.alert(
      'Sign out',
      "You'll need to sign in again to see your moments.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut()
              if (error) throw error
              router.replace('/login')
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not sign out')
            }
          },
        },
      ]
    )
  }

  const displayName = profile?.display_name || 'User'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  type SettingsItem =
    | { icon: IoniconsName; label: string; iconColor: string; type: 'nav'; onPress: () => void }
    | { icon: IoniconsName; label: string; iconColor: string; type: 'toggle'; value: boolean; onToggle: (v: boolean) => void }

  const settingsItems: SettingsItem[] = [
    {
      icon: 'create-outline',
      label: 'Edit Profile',
      iconColor: '#722F37',
      type: 'nav',
      onPress: () => router.push('/profile/edit'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      iconColor: '#D4A574',
      type: 'toggle',
      value: profile?.notifications_enabled ?? true,
      onToggle: toggleNotifications,
    },
    {
      icon: 'globe-outline',
      label: 'Language',
      iconColor: '#2D6A4F',
      type: 'nav',
      onPress: () => router.push('/profile/language'),
    },
    {
      icon: 'chatbubble-ellipses-outline',
      label: 'Talk to Us',
      iconColor: '#722F37',
      type: 'nav',
      onPress: () => router.push('/profile/talk-to-us'),
    },
  ]

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={WINE} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Profile card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.name}>{displayName}</Text>
              {profile?.username ? <Text style={styles.handle}>@{profile.username}</Text> : null}
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.moments}</Text>
                  <Text style={styles.statLabel}>Moments</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.wines}</Text>
                  <Text style={styles.statLabel}>Wines</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.family}</Text>
                  <Text style={styles.statLabel}>Family</Text>
                </View>
              </View>
            </View>

            {/* Settings list */}
            <View style={styles.settingsList}>
              {settingsItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingsRow,
                    index < settingsItems.length - 1 && styles.settingsRowBorder,
                  ]}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                  onPress={item.type === 'nav' ? item.onPress : undefined}
                  disabled={item.type === 'toggle'}
                >
                  <View style={[styles.settingsIconWrapper, { backgroundColor: `${item.iconColor}18` }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#E0D6CC', true: '#722F3780' }}
                      thumbColor={item.value ? WINE : '#FFFFFF'}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#C4B5A5" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Sign out */}
            <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.7} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color="#C0392B" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
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
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrapper: { marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#C2703E',
    marginBottom: 6,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F0E8E0',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statNumber: {
    fontSize: 22,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: { width: 1, height: 36, backgroundColor: '#F0E8E0' },

  // Settings list
  settingsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EBE0',
  },
  settingsIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#1C1C1E',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 50,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C0392B',
  },
})
