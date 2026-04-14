import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as ImagePicker from 'expo-image-picker'

import { createMoment } from '../../features/moments/api'
import { momentFormSchema, type MomentFormValues, type PhotoInput } from '../../features/moments/schema'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function NewMomentScreen() {
  const params = useLocalSearchParams<{ wineId?: string; wineName?: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [wineLabel, setWineLabel] = useState<string | null>(params.wineName ?? null)

  const { control, handleSubmit, setValue, watch, formState } = useForm<MomentFormValues>({
    resolver: zodResolver(momentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      happenedAt: todayIso(),
      locationName: '',
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      wineId: params.wineId ?? '',
      rating: undefined,
      photos: [],
    },
  })

  if (params.wineId && watch('wineId') !== params.wineId) {
    setValue('wineId', params.wineId, { shouldValidate: true })
    if (params.wineName) setWineLabel(params.wineName)
  }

  const photos = watch('photos')
  const rating = watch('rating')

  const pickPhoto = async () => {
    if (photos.length >= 3) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add pictures.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    const next: PhotoInput[] = [
      ...photos,
      { uri: asset.uri, isCover: photos.length === 0 },
    ]
    setValue('photos', next, { shouldValidate: true })
  }

  const removePhoto = (index: number) => {
    const next = photos.filter((_, i) => i !== index)
    if (next.length > 0 && !next.some((p) => p.isCover)) {
      next[0] = { ...next[0], isCover: true }
    }
    setValue('photos', next, { shouldValidate: true })
  }

  const markCover = (index: number) => {
    const next = photos.map((p, i) => ({ ...p, isCover: i === index }))
    setValue('photos', next, { shouldValidate: true })
  }

  const onSubmit = async (values: MomentFormValues) => {
    try {
      setSubmitting(true)
      await createMoment(values)
      router.back()
    } catch (err) {
      console.error(err)
      Alert.alert('Could not save moment', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Moment</Text>
          <View style={styles.iconBtn} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Field label="Title" error={formState.errors.title?.message}>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="A toast in Mendoza"
                    placeholderTextColor="#A98B7E"
                  />
                )}
              />
            </Field>

            <Field label="Description" error={formState.errors.description?.message}>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="Who was there, what made it special…"
                    placeholderTextColor="#A98B7E"
                    multiline
                  />
                )}
              />
            </Field>

            <Field label="Date (YYYY-MM-DD)" error={formState.errors.happenedAt?.message}>
              <Controller
                control={control}
                name="happenedAt"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="2026-04-13"
                    placeholderTextColor="#A98B7E"
                    autoCapitalize="none"
                  />
                )}
              />
            </Field>

            <Field label="Location name" error={formState.errors.locationName?.message}>
              <Controller
                control={control}
                name="locationName"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Mendoza, Argentina"
                    placeholderTextColor="#A98B7E"
                  />
                )}
              />
            </Field>

            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Latitude" error={formState.errors.latitude?.message}>
                  <Controller
                    control={control}
                    name="latitude"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.input}
                        value={typeof value === 'number' && !Number.isNaN(value) ? String(value) : ''}
                        onChangeText={(t) => onChange(t ? Number(t) : Number.NaN)}
                        placeholder="-32.89"
                        placeholderTextColor="#A98B7E"
                        keyboardType="numbers-and-punctuation"
                      />
                    )}
                  />
                </Field>
              </View>
              <View style={styles.half}>
                <Field label="Longitude" error={formState.errors.longitude?.message}>
                  <Controller
                    control={control}
                    name="longitude"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.input}
                        value={typeof value === 'number' && !Number.isNaN(value) ? String(value) : ''}
                        onChangeText={(t) => onChange(t ? Number(t) : Number.NaN)}
                        placeholder="-68.85"
                        placeholderTextColor="#A98B7E"
                        keyboardType="numbers-and-punctuation"
                      />
                    )}
                  />
                </Field>
              </View>
            </View>

            <Field label="Wine" error={formState.errors.wineId?.message}>
              <Pressable
                style={styles.input}
                onPress={() => router.push('/moments/wine-picker')}
              >
                <Text style={{ color: wineLabel ? INK : '#A98B7E', fontFamily: 'DMSans_400Regular' }}>
                  {wineLabel ?? 'Select or create a wine'}
                </Text>
              </Pressable>
            </Field>

            <Field label="Rating (optional)">
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setValue('rating', n === rating ? undefined : n, { shouldValidate: true })}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={rating && rating >= n ? 'star' : 'star-outline'}
                      size={28}
                      color={WINE}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Photos" error={formState.errors.photos?.message as string | undefined}>
              <View style={styles.photosRow}>
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.coverBadge, photo.isCover && styles.coverBadgeActive]}
                      onPress={() => markCover(index)}
                    >
                      <Text style={[styles.coverText, photo.isCover && styles.coverTextActive]}>
                        {photo.isCover ? 'Cover' : 'Set cover'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 3 && (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                    <Ionicons name="add" size={28} color={WINE} />
                  </TouchableOpacity>
                )}
              </View>
            </Field>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submit, submitting && styles.submitDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Save moment</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: WINE,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 20, paddingBottom: 120 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  stars: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  photosRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  photoWrap: { position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#E5D5C5' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
  },
  coverBadgeActive: { backgroundColor: WINE },
  coverText: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: WINE },
  coverTextActive: { color: '#FFFFFF' },
  photoAdd: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WINE,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  error: {
    marginTop: 4,
    color: '#B23B3B',
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: BG,
  },
  submit: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
