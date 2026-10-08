import { useState } from 'react'
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

import { useCreateFamily, useUpdateFamily } from '../../features/family/hooks'
import { uploadFamilyCoverPhoto } from '../../features/family/cover-upload'
import { supabase } from '../../lib/supabase'
import { requireOnline } from '../../lib/connection/require-online'
import { useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const DESC_MAX = 80

export default function FamilyCreateScreen() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUri, setCoverUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const createFamilyMutation = useCreateFamily()
  const updateFamilyMutation = useUpdateFamily()

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('family.edit.photosPermissionTitle'), t('family.create.photosPermissionBody'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]?.uri) {
      setCoverUri(result.assets[0].uri)
    }
  }

  const submit = async () => {
    const n = name.trim()
    if (n.length < 2) {
      Alert.alert(t('family.edit.nameRequiredTitle'), t('family.edit.nameRequiredBody'))
      return
    }
    const d = description.trim()
    if (d.length > DESC_MAX) {
      Alert.alert(t('family.edit.descriptionTooLongTitle'), t('family.edit.descriptionTooLongBody', { max: DESC_MAX }))
      return
    }
    try {
      setSaving(true)
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Not signed in')

      const { family } = await createFamilyMutation.mutateAsync({
        name: n,
        description: d.length > 0 ? d : undefined,
      })

      if (coverUri) {
        const url = await uploadFamilyCoverPhoto(userId, family.id, coverUri)
        await updateFamilyMutation.mutateAsync({ photo_url: url })
      }

      router.back()
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('family.create.failed'))
    } finally {
      setSaving(false)
    }
  }

  const descLeft = DESC_MAX - description.length

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('family.create.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('family.edit.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('family.create.namePlaceholder')}
            placeholderTextColor="#A98B7E"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>{t('family.edit.descriptionLabel')}</Text>
          <TextInput
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, DESC_MAX))}
            placeholder={t('family.edit.descriptionPlaceholder')}
            placeholderTextColor="#A98B7E"
            style={[styles.input, styles.inputMultiline]}
            multiline
            maxLength={DESC_MAX}
          />
          <Text style={styles.counter}>{t('family.edit.charactersLeft', { count: descLeft })}</Text>

          <Text style={styles.label}>{t('family.create.coverLabel')}</Text>
          <TouchableOpacity style={styles.coverPicker} onPress={pickCover} activeOpacity={0.85}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverPreview} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={36} color={SUBTLE} />
                <Text style={styles.coverPlaceholderText}>{t('family.create.coverPlaceholder')}</Text>
              </View>
            )}
          </TouchableOpacity>
          {coverUri ? (
            <TouchableOpacity onPress={() => setCoverUri(null)} style={styles.removePhoto}>
              <Text style={styles.removePhotoText}>{t('family.create.removePhoto')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.cta, saving && styles.ctaDisabled]}
            onPress={() => requireOnline(submit)}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>{t('family.create.submit')}</Text>
            )}
          </TouchableOpacity>
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
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  counter: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  coverPicker: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  coverPreview: { width: '100%', height: 160 },
  coverPlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  coverPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  removePhoto: { alignSelf: 'flex-start', marginBottom: 24 },
  removePhotoText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: WINE },
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
