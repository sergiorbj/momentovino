import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'

import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
  UsernameFormatError,
  UsernameTakenError,
} from '../../features/profile/api'
import {
  useProfile,
  useSetUsername,
  useUpdateProfile,
} from '../../features/profile/hooks'
import { uploadAvatar } from '../../features/profile/avatar-upload'
import { supabase } from '../../lib/supabase'
import { requireOnline } from '../../lib/connection/require-online'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const NAME_MAX = 50
const BIO_MAX = 160

export default function EditProfileScreen() {
  const { data, isLoading } = useProfile()
  const updateProfileMutation = useUpdateProfile()
  const setUsernameMutation = useSetUsername()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsernameState] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (hydrated || !data) return
    const { profile } = data
    setDisplayName(profile.display_name || '')
    setUsernameState(profile.username || '')
    setOriginalUsername(profile.username || '')
    setBio(profile.bio || '')
    setAvatarUrl(profile.avatar_url)
    setHydrated(true)
  }, [data, hydrated])

  const loading = isLoading && !data

  const usernameValid = USERNAME_REGEX.test(username)
  const usernameChanged = username !== originalUsername

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo library access to change your avatar.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]?.uri) {
      setLocalAvatarUri(result.assets[0].uri)
    }
  }

  const save = async () => {
    const name = displayName.trim()
    if (name.length < 2) {
      Alert.alert('Name required', 'Enter at least 2 characters.')
      return
    }
    if (name.length > NAME_MAX) {
      Alert.alert('Name too long', `Maximum ${NAME_MAX} characters.`)
      return
    }
    const trimBio = bio.trim()
    if (trimBio.length > BIO_MAX) {
      Alert.alert('Bio too long', `Maximum ${BIO_MAX} characters.`)
      return
    }
    const normalizedUsername = username.trim().toLowerCase()
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      Alert.alert(
        'Invalid username',
        `Use ${USERNAME_MIN}–${USERNAME_MAX} lowercase letters, numbers, dots or underscores.`
      )
      return
    }

    try {
      setSaving(true)
      let newAvatarUrl = avatarUrl

      if (localAvatarUri) {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (!userId) throw new Error('Not signed in')
        newAvatarUrl = await uploadAvatar(userId, localAvatarUri)
      }

      await updateProfileMutation.mutateAsync({
        display_name: name,
        bio: trimBio || null,
        avatar_url: newAvatarUrl,
      })

      // Username goes through a dedicated RPC (atomic uniqueness check).
      // Done after the main profile update so a conflict here doesn't
      // silently discard other edits the user made.
      if (usernameChanged) {
        try {
          await setUsernameMutation.mutateAsync(normalizedUsername)
        } catch (e) {
          if (e instanceof UsernameTakenError) {
            Alert.alert('Username taken', 'Try another one. Other changes were saved.')
            return
          }
          if (e instanceof UsernameFormatError) {
            Alert.alert('Invalid username', e.message)
            return
          }
          throw e
        }
      }

      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const previewUri = localAvatarUri || avatarUrl
  const initials = (displayName || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const bioLeft = BIO_MAX - bio.length

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={WINE} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar}>
              <Text style={styles.changePhotoText}>Change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={(t) => setDisplayName(t.slice(0, NAME_MAX))}
            placeholder="Your name"
            placeholderTextColor="#A98B7E"
            style={styles.input}
            autoCapitalize="words"
            maxLength={NAME_MAX}
          />

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.usernamePrefix}>@</Text>
            <TextInput
              value={username}
              onChangeText={(t) =>
                setUsernameState(
                  t
                    .toLowerCase()
                    .replace(/[^a-z0-9_.]/g, '')
                    .slice(0, USERNAME_MAX)
                )
              }
              placeholder="your_handle"
              placeholderTextColor="#A98B7E"
              style={styles.usernameInput}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={USERNAME_MAX}
            />
          </View>
          <Text style={[styles.hint, !usernameValid && styles.hintError]}>
            {username.length === 0
              ? 'Required.'
              : `${USERNAME_MIN}–${USERNAME_MAX} lowercase letters, numbers, dots or underscores.`}
          </Text>

          {/* Bio */}
          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            placeholder="Tell us a bit about yourself..."
            placeholderTextColor="#A98B7E"
            style={[styles.input, styles.inputMultiline]}
            multiline
            maxLength={BIO_MAX}
          />
          <Text style={styles.counter}>{bioLeft} characters left</Text>

          {/* Save */}
          <TouchableOpacity
            style={[styles.cta, saving && styles.ctaDisabled]}
            onPress={() => requireOnline(save)}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { justifyContent: 'center', alignItems: 'center' },
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
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 34,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WINE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: WINE,
  },

  // Form
  label: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  usernamePrefix: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginBottom: 16,
  },
  hintError: { color: '#C0392B' },
  counter: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  cta: {
    backgroundColor: '#5C4033',
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
