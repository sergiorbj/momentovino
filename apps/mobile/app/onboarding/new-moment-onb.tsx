import { useCallback, useEffect, useRef, useState } from 'react'
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
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as ImagePicker from 'expo-image-picker'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { z } from 'zod'

import { photoInputSchema, type PhotoInput } from '../../features/moments/schema'
import { searchLocations, type LocationResult } from '../../features/moments/location-api'
import {
  getCapture,
  setCapturedMoment,
} from '../../features/onboarding/onboarding-capture'
import { useLanguage, useTranslation } from '../../features/i18n/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

// Same shape as `momentFormSchema` minus `wineId` (the wine row doesn't exist
// yet — it gets created in `finalizeAccount` post-auth) and with photos
// relaxed to optional, since onboarding accepts a moment without photos.
function buildOnboardingMomentSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(2, t('onboarding.newMoment.validation.titleRequired')).max(80),
    description: z.string().max(500).optional(),
    happenedAt: z.string().min(1, t('onboarding.newMoment.validation.dateRequired')),
    locationName: z.string().min(2, t('onboarding.newMoment.validation.locationRequired')),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    rating: z.number().int().min(1).max(5).optional(),
    photos: z.array(photoInputSchema).max(3),
  })
}

type OnboardingMomentValues = z.infer<ReturnType<typeof buildOnboardingMomentSchema>>

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function OnboardingNewMomentScreen() {
  const { t } = useTranslation()
  const language = useLanguage()
  const wine = getCapture().wine
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!wine) router.replace('/onboarding/scanner-onb')
  }, [wine])

  const schema = useRef(buildOnboardingMomentSchema(t)).current

  const { control, handleSubmit, setValue, watch, formState } = useForm<OnboardingMomentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      happenedAt: todayIso(),
      locationName: '',
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      rating: undefined,
      photos: [],
    },
  })

  const photos = watch('photos')
  const rating = watch('rating')

  const [datePickerVisible, setDatePickerVisible] = useState(false)

  const handleDateConfirm = useCallback(
    (date: Date) => {
      const iso = date.toISOString().slice(0, 10)
      setValue('happenedAt', iso, { shouldValidate: true })
      setDatePickerVisible(false)
    },
    [setValue],
  )

  const happenedAt = watch('happenedAt')
  const displayDate = happenedAt
    ? new Date(happenedAt + 'T00:00:00').toLocaleDateString(language, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openLocationPicker = useCallback(() => {
    setLocationPickerOpen(true)
    setLocationQuery('')
    setLocationLoading(true)
    searchLocations('').then((r) => {
      setLocationResults(r)
      setLocationLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!locationPickerOpen) return

    if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    setLocationLoading(true)

    locationTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(locationQuery)
        setLocationResults(results)
      } catch {
        // keep existing results
      } finally {
        setLocationLoading(false)
      }
    }, 300)

    return () => {
      if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    }
  }, [locationQuery, locationPickerOpen])

  const selectLocation = useCallback(
    (loc: LocationResult) => {
      setSelectedLocation(loc.displayName)
      setValue('locationName', loc.displayName, { shouldValidate: true })
      setValue('latitude', loc.latitude, { shouldValidate: true })
      setValue('longitude', loc.longitude, { shouldValidate: true })
      setLocationPickerOpen(false)
    },
    [setValue],
  )

  const pickPhoto = async () => {
    if (photos.length >= 3) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(
        t('onboarding.newMoment.errors.permissionNeededTitle'),
        t('onboarding.newMoment.errors.permissionNeededBody'),
      )
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

  const onSubmit = (values: OnboardingMomentValues) => {
    setSubmitting(true)
    setCapturedMoment(values)
    router.push('/onboarding/atlas')
    setSubmitting(false)
  }

  if (!wine) return null

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('onboarding.newMoment.headerTitle')}</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Field label={t('onboarding.newMoment.titleLabel')} error={formState.errors.title?.message}>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder={t('onboarding.newMoment.titlePlaceholder')}
                    placeholderTextColor="#A98B7E"
                  />
                )}
              />
            </Field>

            <Field
              label={t('onboarding.newMoment.descriptionLabel')}
              error={formState.errors.description?.message}
            >
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder={t('onboarding.newMoment.descriptionPlaceholder')}
                    placeholderTextColor="#A98B7E"
                    multiline
                  />
                )}
              />
            </Field>

            <Field
              label={t('onboarding.newMoment.dateLabel')}
              error={formState.errors.happenedAt?.message}
            >
              <Pressable style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={displayDate ? WINE : '#A98B7E'}
                />
                <Text
                  style={{
                    color: displayDate ? INK : '#A98B7E',
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                  }}
                >
                  {displayDate ?? t('onboarding.newMoment.pickDate')}
                </Text>
              </Pressable>
              <DateTimePickerModal
                isVisible={datePickerVisible}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                date={happenedAt ? new Date(happenedAt + 'T00:00:00') : new Date()}
                maximumDate={new Date()}
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerVisible(false)}
                confirmTextIOS={t('onboarding.newMoment.datePickerConfirm')}
                cancelTextIOS={t('onboarding.newMoment.datePickerCancel')}
                themeVariant="light"
              />
            </Field>

            <Field
              label={t('onboarding.newMoment.locationLabel')}
              error={formState.errors.locationName?.message}
            >
              {locationPickerOpen ? (
                <View>
                  <View style={styles.locSearchWrap}>
                    <Ionicons name="search" size={16} color={SUBTLE} />
                    <TextInput
                      style={styles.locSearchInput}
                      value={locationQuery}
                      onChangeText={setLocationQuery}
                      placeholder={t('onboarding.newMoment.locationSearch')}
                      placeholderTextColor="#A98B7E"
                      autoFocus
                    />
                    {locationLoading && <ActivityIndicator size="small" color={WINE} />}
                    <TouchableOpacity onPress={() => setLocationPickerOpen(false)}>
                      <Ionicons name="close-circle" size={20} color={SUBTLE} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.locResults}>
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.locList}
                      keyboardShouldPersistTaps="handled"
                    >
                      {locationResults.length === 0 && !locationLoading && (
                        <Text style={styles.locEmpty}>{t('onboarding.newMoment.noResults')}</Text>
                      )}
                      {locationResults.map((item, index) => (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.locDivider} />}
                          <TouchableOpacity
                            style={styles.locRow}
                            onPress={() => selectLocation(item)}
                          >
                            <Ionicons name="location-outline" size={16} color={WINE} />
                            <View style={styles.locRowText}>
                              <Text style={styles.locCity}>
                                {item.city || item.displayName.split(',')[0]}
                              </Text>
                              <Text style={styles.locCountry}>{item.country}</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.input} onPress={openLocationPicker}>
                  <Text
                    style={{
                      color: selectedLocation ? INK : '#A98B7E',
                      fontFamily: 'DMSans_400Regular',
                    }}
                  >
                    {selectedLocation ?? t('onboarding.newMoment.locationTap')}
                  </Text>
                </Pressable>
              )}
            </Field>

            <Field label={t('onboarding.newMoment.wineLabel')}>
              <View style={styles.wineLocked}>
                <Text style={styles.wineLockedText} numberOfLines={1}>
                  {wine.name}
                </Text>
                <Ionicons name="lock-closed" size={14} color={SUBTLE} />
              </View>
            </Field>

            <Field label={t('onboarding.newMoment.ratingLabel')}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() =>
                      setValue('rating', n === rating ? undefined : n, { shouldValidate: true })
                    }
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

            <Field label={t('onboarding.newMoment.photosLabel')} error={formState.errors.photos?.message as string | undefined}>
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
                      <Text
                        style={[styles.coverText, photo.isCover && styles.coverTextActive]}
                      >
                        {photo.isCover ? t('onboarding.newMoment.cover') : t('onboarding.newMoment.setCover')}
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
                <Text style={styles.submitText}>{t('onboarding.newMoment.saveMoment')}</Text>
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
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
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
    fontSize: 16,
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  // Locked-display variant of `input` for the wine row.
  wineLocked: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wineLockedText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
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
  locSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    padding: 0,
  },
  locResults: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  locList: { maxHeight: 240 },
  locDivider: { height: 1, backgroundColor: '#F0E6DD' },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locRowText: { flex: 1 },
  locCity: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: INK,
  },
  locCountry: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: SUBTLE,
    marginTop: 1,
  },
  locEmpty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: SUBTLE,
    textAlign: 'center',
    paddingVertical: 20,
  },
})
