import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const SETTINGS_ITEMS: { icon: IoniconsName; label: string; iconColor?: string }[] = [
  { icon: 'create-outline', label: 'Edit Profile', iconColor: '#722F37' },
  { icon: 'notifications-outline', label: 'Notifications', iconColor: '#D4A574' },
  { icon: 'lock-closed-outline', label: 'Privacy', iconColor: '#5C4033' },
  { icon: 'moon-outline', label: 'Appearance', iconColor: '#C2703E' },
  { icon: 'globe-outline', label: 'Language', iconColor: '#2D6A4F' },
  { icon: 'help-circle-outline', label: 'Help & Support', iconColor: '#722F37' },
]

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#722F37" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Profile card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>👨</Text>
              </View>
            </View>

            <Text style={styles.name}>Carlos Silva</Text>
            <Text style={styles.handle}>@carlossilva</Text>
            <Text style={styles.bio}>
              Wine enthusiast from São Paulo 🇧🇷{'\n'}Exploring the world one glass at a time.
            </Text>

            <View style={styles.divider} />

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>23</Text>
                <Text style={styles.statLabel}>Moments</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>47</Text>
                <Text style={styles.statLabel}>Wines</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>1</Text>
                <Text style={styles.statLabel}>Family</Text>
              </View>
            </View>
          </View>

          {/* Settings list */}
          <View style={styles.settingsList}>
            {SETTINGS_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingsRow,
                  index < SETTINGS_ITEMS.length - 1 && styles.settingsRowBorder,
                ]}
                activeOpacity={0.7}
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
          <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#C0392B" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
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
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 10, elevation: 3,
  },
  avatarWrapper: { marginBottom: 14 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#8B4513',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 42 },
  name: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#C2703E',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#5C4033',
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    width: '100%', height: 1,
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
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
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
    width: 34, height: 34, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
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
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C0392B',
  },
})
