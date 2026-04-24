 import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'

import type { FamilyMemberRow } from '../../features/family/api'
import { useFamily, useUpdateFamily } from '../../features/family/hooks'
import { uploadFamilyCoverPhoto } from '../../features/family/cover-upload'
import { supabase } from '../../lib/supabase'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const CTA_BG = '#5C4033'
const DESC_MAX = 80
/** Letterboxing inside the preview card: black with readable opacity. */
const COVER_PREVIEW_LETTERBOX = 'rgba(0,0,0,0.5)'

function EmptyNoFamily({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={96} color={WINE} style={styles.emptyIcon} />
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
  const { width: winW, height: winH } = useWindowDimensions()
  const safeInsets = useSafeAreaInsets()
  const {
    data: dash,
    isLoading,
    isFetching,
    refetch,
    error: familyError,
  } = useFamily()
  const updateFamilyMutation = useUpdateFamily()
  const loading = isLoading && !dash
  const refreshing = isFetching && !isLoading
  const loadError =
    familyError instanceof Error ? familyError.message : null
  const [selfId, setSelfId] = useState<string | null>(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [coverPreviewVisible, setCoverPreviewVisible] = useState(false)
  const coverUri = dash?.family?.photo_url ?? null
  const coverBackdropOp = useRef(new Animated.Value(0)).current
  const coverCardOp = useRef(new Animated.Value(0)).current
  const coverCardScale = useRef(new Animated.Value(0.94)).current
  const coverClosingRef = useRef(false)

  const resetCoverPreviewAnims = useCallback(() => {
    coverBackdropOp.setValue(0)
    coverCardOp.setValue(0)
    coverCardScale.setValue(0.94)
    coverClosingRef.current = false
  }, [coverBackdropOp, coverCardOp, coverCardScale])

  const playCoverPreviewOpen = useCallback(() => {
    coverClosingRef.current = false
    coverBackdropOp.setValue(0)
    coverCardOp.setValue(0)
    coverCardScale.setValue(0.94)
    Animated.parallel([
      Animated.timing(coverBackdropOp, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(coverCardOp, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(coverCardScale, {
        toValue: 1,
        damping: 20,
        stiffness: 200,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]).start()
  }, [coverBackdropOp, coverCardOp, coverCardScale])

  const closeCoverPreview = useCallback(() => {
    if (coverClosingRef.current) return
    coverClosingRef.current = true
    Animated.parallel([
      Animated.timing(coverBackdropOp, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(coverCardOp, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(coverCardScale, {
        toValue: 0.94,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      coverClosingRef.current = false
      if (finished) setCoverPreviewVisible(false)
    })
  }, [coverBackdropOp, coverCardOp, coverCardScale])

  useEffect(() => {
    if (coverPreviewVisible && coverUri) {
      playCoverPreviewOpen()
    }
  }, [coverPreviewVisible, coverUri, playCoverPreviewOpen])

  const beginEditDetails = useCallback(() => {
    if (!dash?.family) return
    setDraftName(dash.family.name)
    setDraftDescription((dash.family.description ?? '').slice(0, DESC_MAX))
    setEditingDetails(true)
  }, [dash?.family])

  const cancelEditDetails = useCallback(() => {
    Keyboard.dismiss()
    setEditingDetails(false)
  }, [])

  const saveEditDetails = useCallback(async () => {
    if (!dash?.family) return
    const n = draftName.trim()
    if (n.length < 2) {
      Alert.alert('Name required', 'Enter at least 2 characters.')
      return
    }
    const d = draftDescription.trim()
    if (d.length > DESC_MAX) {
      Alert.alert('Description', `Maximum ${DESC_MAX} characters.`)
      return
    }
    setSavingDetails(true)
    try {
      await updateFamilyMutation.mutateAsync({
        name: n,
        description: d.length > 0 ? d : null,
      })
      Keyboard.dismiss()
      setEditingDetails(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSavingDetails(false)
    }
  }, [dash?.family, draftName, draftDescription, updateFamilyMutation])

  const pickCoverPhoto = useCallback(async () => {
    if (!dash?.family || !dash.isOwner || !selfId) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo library access to change the cover image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]?.uri) return
    setUploadingPhoto(true)
    try {
      const url = await uploadFamilyCoverPhoto(selfId, dash.family.id, result.assets[0].uri)
      await updateFamilyMutation.mutateAsync({ photo_url: url })
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update cover photo')
    } finally {
      setUploadingPhoto(false)
    }
  }, [dash?.family, dash?.isOwner, selfId, updateFamilyMutation])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setSelfId(data.user?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      return () => {
        setEditingDetails(false)
        setCoverPreviewVisible(false)
        resetCoverPreviewAnims()
        Keyboard.dismiss()
      }
    }, [resetCoverPreviewAnims]),
  )

  const onRefresh = useCallback(async () => {
    setEditingDetails(false)
    setCoverPreviewVisible(false)
    resetCoverPreviewAnims()
    Keyboard.dismiss()
    try {
      await refetch()
    } catch (e) {
      console.error(e)
    }
  }, [refetch, resetCoverPreviewAnims])

  const hasFamily = Boolean(dash?.family)
  const soloAdmin = hasFamily && Boolean(dash?.isOwner) && (dash?.members.length ?? 0) === 1
  const descRemaining = DESC_MAX - draftDescription.length

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Modal
        visible={Boolean(coverUri && coverPreviewVisible)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeCoverPreview}
      >
        <View style={styles.coverModalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.coverModalBlurWrap, { opacity: coverBackdropOp }]}
          >
            <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={[StyleSheet.absoluteFillObject, styles.coverModalTintOverlay]} />
          </Animated.View>
          {coverUri ? (
            <>
              <Animated.View
                style={[
                  styles.coverModalImageLayer,
                  {
                    width: winW,
                    height: winH,
                    opacity: coverCardOp,
                    transform: [{ scale: coverCardScale }],
                  },
                ]}
              >
                <Pressable
                  style={styles.coverModalPressLayer}
                  onPress={closeCoverPreview}
                  accessibilityLabel="Dismiss photo preview"
                >
                  <View style={[styles.coverModalImageFrame, { backgroundColor: COVER_PREVIEW_LETTERBOX }]}>
                    <View style={styles.coverModalImageHitThrough} pointerEvents="none">
                      <Image
                        source={{ uri: coverUri }}
                        style={styles.coverModalCardImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
              <View
                style={[
                  styles.coverModalChrome,
                  {
                    paddingTop: safeInsets.top + 14,
                    paddingEnd: safeInsets.right + 18,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.coverModalClose}
                  onPress={closeCoverPreview}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close photo preview"
                >
                  <Ionicons name="close" size={26} color={INK} />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family</Text>
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
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WINE} />}
          >
            <View style={styles.familyCard}>
              <View style={styles.familyBanner}>
                {dash!.family!.photo_url ? (
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setCoverPreviewVisible(true)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="View cover photo full screen"
                  >
                    <Image
                      source={{ uri: dash!.family!.photo_url }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
                {dash!.isOwner ? (
                  <TouchableOpacity
                    style={styles.bannerEditFab}
                    onPress={pickCoverPhoto}
                    disabled={uploadingPhoto}
                    activeOpacity={0.85}
                    accessibilityLabel="Change family cover photo"
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.familyCardBody}>
                {dash!.isOwner && editingDetails ? (
                  <>
                    <Text style={styles.inlineLabel}>Family name</Text>
                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder="Family name"
                      placeholderTextColor="#A98B7E"
                      style={styles.inlineInput}
                      autoCapitalize="words"
                      editable={!savingDetails}
                    />
                    <Text style={styles.inlineLabel}>Description (optional)</Text>
                    <TextInput
                      value={draftDescription}
                      onChangeText={(t) => setDraftDescription(t.slice(0, DESC_MAX))}
                      placeholder="Short line about your family"
                      placeholderTextColor="#A98B7E"
                      style={[styles.inlineInput, styles.inlineInputMultiline]}
                      multiline
                      maxLength={DESC_MAX}
                      editable={!savingDetails}
                    />
                    <Text style={styles.inlineCounter}>{descRemaining} characters left</Text>
                    <View style={styles.inlineActions}>
                      <TouchableOpacity
                        style={[styles.inlineBtn, styles.inlineBtnSecondary]}
                        onPress={cancelEditDetails}
                        disabled={savingDetails}
                      >
                        <Text style={styles.inlineBtnSecondaryText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inlineBtn, styles.inlineBtnPrimary, savingDetails && styles.inlineBtnDisabled]}
                        onPress={() => void saveEditDetails()}
                        disabled={savingDetails}
                      >
                        {savingDetails ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.inlineBtnPrimaryText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : dash!.isOwner ? (
                  <View style={styles.familyNameRow}>
                    <Text style={styles.familyName} numberOfLines={2}>
                      {dash!.family!.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.nameEditBtn}
                      onPress={beginEditDetails}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Edit family name and description"
                    >
                      <Ionicons name="create-outline" size={22} color={WINE} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.familyNameOnly} numberOfLines={2}>
                    {dash!.family!.name}
                  </Text>
                )}
                {!dash!.isOwner || !editingDetails ? (
                  dash!.family!.description ? (
                    <Text style={styles.familyDescription}>{dash!.family!.description}</Text>
                  ) : null
                ) : null}
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
    justifyContent: 'flex-start',
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 18,
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
    position: 'relative',
    overflow: 'hidden',
  },
  bannerEditFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    elevation: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverModalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  coverModalBlurWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  coverModalTintOverlay: {
    backgroundColor: 'rgba(63, 42, 46, 0.2)',
  },
  coverModalImageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  coverModalPressLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  coverModalImageFrame: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  coverModalImageHitThrough: {
    ...StyleSheet.absoluteFillObject,
  },
  coverModalCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverModalChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  coverModalClose: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 235, 224, 0.92)',
  },
  familyCardBody: { padding: 16, alignItems: 'stretch' },
  familyNameRow: {
    position: 'relative',
    alignSelf: 'stretch',
    marginBottom: 8,
    paddingHorizontal: 36,
  },
  familyName: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
  },
  familyNameOnly: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: WINE,
    textAlign: 'center',
    marginBottom: 8,
  },
  nameEditBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  inlineLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: SUBTLE,
    marginBottom: 6,
  },
  inlineInput: {
    backgroundColor: '#F5EBE0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  inlineInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  inlineCounter: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 4,
  },
  inlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBtnPrimary: { backgroundColor: CTA_BG },
  inlineBtnPrimaryText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
  inlineBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C4B8',
  },
  inlineBtnSecondaryText: { color: INK, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
  inlineBtnDisabled: { opacity: 0.6 },
  familyDescription: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  familyMeta: {
    fontSize: 16,
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
