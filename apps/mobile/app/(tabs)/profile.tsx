import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import type { ComponentProps } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { useEntitlement } from '../../features/entitlement/hooks'
import { useProfile } from '../../features/profile/hooks'
import {
  hasProEntitlement,
  restorePurchases,
} from '../../lib/purchases'
import { queryKeys } from '../../lib/query-keys'
import { supabase } from '../../lib/supabase'

type IoniconsName = ComponentProps<typeof Ionicons>['name']

const WINE = '#722F37'
const BG = '#F5EBE0'

export default function ProfileScreen() {
  const qc = useQueryClient()
  const { data: entData, isLoading: entLoading } = useEntitlement()
  const [restoring, setRestoring] = useState(false)
  const { data, isLoading } = useProfile()
  const profile = data?.profile ?? null
  const loading = isLoading && !data

  const onRestorePurchases = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Restore purchases',
        'In-app subscriptions are managed on the MomentoVino iOS app.',
      )
      return
    }
    setRestoring(true)
    try {
      const info = await restorePurchases()
      await qc.invalidateQueries({ queryKey: queryKeys.entitlement })
      await qc.invalidateQueries({ queryKey: queryKeys.profile })
      const ok = hasProEntitlement(info)
      Alert.alert(
        ok ? 'Purchases restored' : 'Nothing to restore',
        ok
          ? 'Your subscription is linked to this account.'
          : 'No active App Store subscription found for this Apple ID.',
      )
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : 'Try again later.')
    } finally {
      setRestoring(false)
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
              router.replace('/onboarding')
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

  type SettingsItem = {
    icon: IoniconsName
    label: string
    iconColor: string
    type: 'nav'
    onPress: () => void
  }

  const settingsItems: SettingsItem[] = [
    {
      icon: 'create-outline',
      label: 'Edit Profile',
      iconColor: '#722F37',
      type: 'nav',
      onPress: () => router.push('/profile/edit'),
    },
    // Language switch is hidden until the tabs / moments / wines / family / profile screens
    // are translated. Until then switching language only affects onboarding + auth.
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
            </View>

            {Platform.OS === 'ios' ? (
              <View style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View
                    style={[styles.settingsIconWrapper, { backgroundColor: '#722F3718' }]}
                  >
                    <Ionicons name="sparkles-outline" size={18} color={WINE} />
                  </View>
                  <View style={styles.subscriptionCopy}>
                    <Text style={styles.subscriptionTitle}>Subscription</Text>
                    {entLoading ? (
                      <Text style={styles.subscriptionMeta}>Checking status…</Text>
                    ) : entData?.isPro ? (
                      <>
                        <Text style={styles.subscriptionStatus}>MomentoVino Pro</Text>
                        {entData.expiresAt ? (
                          <Text style={styles.subscriptionMeta}>
                            Renews or expires{' '}
                            {new Date(entData.expiresAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        ) : null}
                        {entData.inBillingRetry ? (
                          <Text style={styles.subscriptionWarn}>
                            Billing issue. Update payment in Settings ▸ Subscriptions.
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.subscriptionMeta}>Free plan</Text>
                    )}
                  </View>
                </View>
                {!entLoading && !entData?.isPro ? (
                  <TouchableOpacity
                    style={[styles.restoreBtn, restoring && styles.restoreBtnDisabled]}
                    onPress={onRestorePurchases}
                    disabled={restoring}
                    activeOpacity={0.85}
                  >
                    {restoring ? (
                      <ActivityIndicator color={WINE} />
                    ) : (
                      <Text style={styles.restoreBtnText}>Restore purchases</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Settings list */}
            <View style={styles.settingsList}>
              {settingsItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingsRow,
                    index < settingsItems.length - 1 && styles.settingsRowBorder,
                  ]}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={[styles.settingsIconWrapper, { backgroundColor: `${item.iconColor}18` }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4B5A5" />
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
    fontSize: 28,
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
    fontSize: 18,
    fontFamily: 'DMSans_500Medium',
    color: '#C2703E',
    marginBottom: 6,
  },
  bio: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },

  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  subscriptionCopy: { flex: 1, gap: 4 },
  subscriptionTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subscriptionStatus: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: '#1C1C1E',
  },
  subscriptionMeta: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    lineHeight: 20,
  },
  subscriptionWarn: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#C2703E',
    marginTop: 4,
    lineHeight: 18,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    backgroundColor: '#F5EBE0',
    minHeight: 44,
  },
  restoreBtnDisabled: { opacity: 0.6 },
  restoreBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },

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
