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
import { Trans } from 'react-i18next'

import type { FamilyMemberRow, IncomingInvitation } from '../../features/family/api'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useFamily,
  useMyInvitations,
  useRemoveFamilyMember,
  useUpdateFamily,
} from '../../features/family/hooks'
import { uploadFamilyCoverPhoto } from '../../features/family/cover-upload'
import { useLanguage, useTranslation } from '../../features/i18n/hooks'
import { translateApiError } from '../../features/i18n/api-error'
import { supabase } from '../../lib/supabase'
import { requireOnline } from '../../lib/connection/require-online'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const CTA_BG = '#5C4033'
const DESC_MAX = 80
/** Letterboxing inside the preview card: black with readable opacity. */
const COVER_PREVIEW_LETTERBOX = 'rgba(0,0,0,0.5)'

function IncomingInvitationCard({
  invitation,
  onAccept,
  onDecline,
  busy,
}: {
  invitation: IncomingInvitation
  onAccept: () => void
  onDecline: () => void
  busy: boolean
}) {
  const { t } = useTranslation()
  const familyName = invitation.family?.name ?? t('family.invitation.fallbackFamily')
  return (
    <View style={styles.invitationCard}>
      <Text style={styles.invitationTitle}>
        <Trans
          i18nKey="family.invitation.title"
          values={{ family: familyName }}
          components={{ b: <Text style={styles.invitationTitleFamilyName} /> }}
        />
      </Text>
      <Text style={styles.invitationSubtitle}>
        {t('family.invitation.subtitle', {
          inviter: invitation.inviter_unknown
            ? t('family.invitation.fallbackInviter')
            : invitation.inviter_name,
        })}
      </Text>
      <View style={styles.invitationActions}>
        <TouchableOpacity
          style={[styles.invitationBtn, styles.invitationDeclineBtn, busy && styles.invitationBtnDisabled]}
          onPress={onDecline}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.invitationDeclineText}>{t('family.invitation.decline')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.invitationBtn, styles.invitationAcceptBtn, busy && styles.invitationBtnDisabled]}
          onPress={onAccept}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.invitationAcceptText}>{t('family.invitation.accept')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function EmptyNoFamily({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={96} color={WINE} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>{t('family.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>{t('family.empty.body')}</Text>
      <TouchableOpacity style={styles.createBtn} onPress={onCreate} activeOpacity={0.85}>
        <Text style={styles.createBtnText}>{t('family.empty.cta')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function EmptyMembersCallout() {
  const { t } = useTranslation()
  return (
    <View style={styles.callout}>
      <Ionicons name="people-outline" size={22} color={WINE} />
      <Text style={styles.calloutText}>{t('family.soloCallout')}</Text>
    </View>
  )
}

function MemberAvatar({ uri }: { uri?: string | null }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(uri) && !failed
  return (
    <View style={styles.memberAvatar}>
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={styles.memberAvatarImg}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="person" size={22} color={WINE} />
      )}
    </View>
  )
}

function MemberRow({
  member,
  isSelf,
  canRemove,
  onRemove,
  removing,
}: {
  member: FamilyMemberRow
  isSelf: boolean
  canRemove: boolean
  onRemove: () => void
  removing: boolean
}) {
  const { t } = useTranslation()
  const label = isSelf
    ? t('family.member.you')
    : member.display_name || member.email || member.user_id.slice(0, 8) + '…'
  const moments = member.moments_count ?? '–'
  const countries = member.countries_count ?? '–'
  const wines = member.wines_count ?? '–'
  return (
    <View style={styles.memberRow}>
      <MemberAvatar uri={member.avatar_url} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.memberStatsLine} numberOfLines={1}>
          <Text style={styles.statNum}>{moments}</Text>
          <Text style={styles.statUnit}> {t('family.member.moments', { count: typeof moments === 'number' ? moments : 0 })}</Text>
          <Text style={styles.statDot}>{'  ·  '}</Text>
          <Text style={styles.statNum}>{countries}</Text>
          <Text style={styles.statUnit}> {t('family.member.countries', { count: typeof countries === 'number' ? countries : 0 })}</Text>
          <Text style={styles.statDot}>{'  ·  '}</Text>
          <Text style={styles.statNum}>{wines}</Text>
          <Text style={styles.statUnit}> {t('family.member.wines', { count: typeof wines === 'number' ? wines : 0 })}</Text>
        </Text>
      </View>
      {canRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          disabled={removing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.memberRemoveBtn, removing && styles.memberRemoveBtnDisabled]}
          accessibilityLabel={t('family.member.removeA11y', { name: label })}
        >
          {removing ? (
            <ActivityIndicator color={WINE} size="small" />
          ) : (
            <Ionicons name="close" size={22} color={WINE} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default function FamilyScreen() {
  const { t } = useTranslation()
  const language = useLanguage()
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
  const { data: incomingData, refetch: refetchIncoming } = useMyInvitations()
  const acceptInvitationMutation = useAcceptInvitation()
  const declineInvitationMutation = useDeclineInvitation()
  const removeMemberMutation = useRemoveFamilyMember()
  const [pendingRemoveUid, setPendingRemoveUid] = useState<string | null>(null)
  const incomingInvitations = incomingData?.invitations ?? []
  const loading = isLoading && !dash
  const refreshing = isFetching && !isLoading
  const loadError =
    familyError ? translateApiError(familyError, t, 'family.loadFailed') : null
  const [selfId, setSelfId] = useState<string | null>(null)
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null)
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
      Alert.alert(t('family.edit.nameRequiredTitle'), t('family.edit.nameRequiredBody'))
      return
    }
    const d = draftDescription.trim()
    if (d.length > DESC_MAX) {
      Alert.alert(t('family.edit.descriptionTooLongTitle'), t('family.edit.descriptionTooLongBody', { max: DESC_MAX }))
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
      Alert.alert(t('common.error'), translateApiError(e, t, 'family.edit.saveFailed'))
    } finally {
      setSavingDetails(false)
    }
  }, [dash?.family, draftName, draftDescription, updateFamilyMutation, t])

  const pickCoverPhoto = useCallback(async () => {
    if (!dash?.family || !dash.isOwner || !selfId) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('family.edit.photosPermissionTitle'), t('family.edit.photosPermissionBody'))
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
      Alert.alert(
        t('family.edit.uploadFailedTitle'),
        translateApiError(e, t, 'family.edit.uploadFailedBody'),
      )
    } finally {
      setUploadingPhoto(false)
    }
  }, [dash?.family, dash?.isOwner, selfId, updateFamilyMutation, t])

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
      await Promise.all([refetch(), refetchIncoming()])
    } catch (e) {
      console.error(e)
    }
  }, [refetch, refetchIncoming, resetCoverPreviewAnims])

  const handleAcceptInvitation = useCallback(
    async (invitationId: string) => {
      setPendingInvitationId(invitationId)
      try {
        const result = await acceptInvitationMutation.mutateAsync(invitationId)
        if ('alreadyInOtherFamily' in result && result.alreadyInOtherFamily) {
          Alert.alert(t('family.invites.alreadyInFamilyTitle'), t('errors.server.already_in_family'))
          return
        }
        Alert.alert(t('family.invites.welcomeTitle'), t('family.invites.welcomeBody'))
      } catch (e) {
        Alert.alert(t('common.error'), translateApiError(e, t, 'family.invites.acceptFailed'))
      } finally {
        setPendingInvitationId(null)
      }
    },
    [acceptInvitationMutation, t],
  )

  const handleDeclineInvitation = useCallback(
    (invitationId: string) => {
      Alert.alert(
        t('family.invites.declineTitle'),
        t('family.invites.declineBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('family.invitation.decline'),
            style: 'destructive',
            onPress: () =>
              void requireOnline(async () => {
                setPendingInvitationId(invitationId)
                try {
                  await declineInvitationMutation.mutateAsync(invitationId)
                } catch (e) {
                  Alert.alert(t('common.error'), translateApiError(e, t, 'family.invites.declineFailed'))
                } finally {
                  setPendingInvitationId(null)
                }
              }),
          },
        ],
      )
    },
    [declineInvitationMutation, t],
  )

  const handleRemoveMember = useCallback(
    (member: FamilyMemberRow) => {
      const memberName = member.display_name || member.email || t('family.remove.fallbackName')
      Alert.alert(
        t('family.remove.title'),
        t('family.remove.body', { name: memberName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('family.remove.confirm'),
            style: 'destructive',
            onPress: () =>
              void requireOnline(async () => {
                setPendingRemoveUid(member.user_id)
                try {
                  await removeMemberMutation.mutateAsync(member.user_id)
                } catch (e) {
                  Alert.alert(
                    t('common.error'),
                    translateApiError(e, t, 'family.remove.failed'),
                  )
                } finally {
                  setPendingRemoveUid(null)
                }
              }),
          },
        ],
      )
    },
    [removeMemberMutation, t],
  )

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
                  accessibilityLabel={t('family.cover.dismissA11y')}
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
                  accessibilityLabel={t('family.cover.closeA11y')}
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
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
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
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.noFamilyScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WINE} />
            }
          >
            {incomingInvitations.length > 0 ? (
              <View style={styles.invitationsSection}>
                {incomingInvitations.map((inv) => (
                  <IncomingInvitationCard
                    key={inv.id}
                    invitation={inv}
                    onAccept={() => void requireOnline(() => handleAcceptInvitation(inv.id))}
                    onDecline={() => handleDeclineInvitation(inv.id)}
                    busy={pendingInvitationId === inv.id}
                  />
                ))}
              </View>
            ) : null}
            <EmptyNoFamily onCreate={() => router.push('/family/create')} />
          </ScrollView>
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
                    accessibilityLabel={t('family.cover.viewA11y')}
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
                    onPress={() => requireOnline(pickCoverPhoto)}
                    disabled={uploadingPhoto}
                    activeOpacity={0.85}
                    accessibilityLabel={t('family.cover.changeA11y')}
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
                    <Text style={styles.inlineLabel}>{t('family.edit.nameLabel')}</Text>
                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder={t('family.edit.nameLabel')}
                      placeholderTextColor="#A98B7E"
                      style={styles.inlineInput}
                      autoCapitalize="words"
                      editable={!savingDetails}
                    />
                    <Text style={styles.inlineLabel}>{t('family.edit.descriptionLabel')}</Text>
                    <TextInput
                      value={draftDescription}
                      onChangeText={(text) => setDraftDescription(text.slice(0, DESC_MAX))}
                      placeholder={t('family.edit.descriptionPlaceholder')}
                      placeholderTextColor="#A98B7E"
                      style={[styles.inlineInput, styles.inlineInputMultiline]}
                      multiline
                      maxLength={DESC_MAX}
                      editable={!savingDetails}
                    />
                    <Text style={styles.inlineCounter}>{t('family.edit.charactersLeft', { count: descRemaining })}</Text>
                    <View style={styles.inlineActions}>
                      <TouchableOpacity
                        style={[styles.inlineBtn, styles.inlineBtnSecondary]}
                        onPress={cancelEditDetails}
                        disabled={savingDetails}
                      >
                        <Text style={styles.inlineBtnSecondaryText}>{t('common.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inlineBtn, styles.inlineBtnPrimary, savingDetails && styles.inlineBtnDisabled]}
                        onPress={() => void requireOnline(saveEditDetails)}
                        disabled={savingDetails}
                      >
                        {savingDetails ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.inlineBtnPrimaryText}>{t('common.save')}</Text>
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
                      accessibilityLabel={t('family.edit.editA11y')}
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
                  {t('family.meta.members', { count: dash!.members.length })}
                  {dash!.pendingInvitations.length > 0
                    ? ` · ${t('family.meta.pendingInvites', { count: dash!.pendingInvitations.length })}`
                    : ''}
                </Text>
              </View>
            </View>

            {soloAdmin ? <EmptyMembersCallout /> : null}

            <Text style={styles.sectionTitle}>{t('family.section.members', { n: dash!.members.length })}</Text>

            {dash!.isOwner ? (
              <TouchableOpacity
                style={styles.inviteCta}
                activeOpacity={0.85}
                onPress={() => router.push('/family/invite-member')}
              >
                <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                <Text style={styles.inviteCtaText}>{t('family.section.inviteCta')}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.membersList}>
              {dash!.members.map((m, index) => {
                const isSelf = m.user_id === selfId
                const canRemove =
                  Boolean(dash!.isOwner) &&
                  !isSelf &&
                  m.user_id !== dash!.family!.owner_id
                return (
                  <View
                    key={m.id}
                    style={[styles.memberRowWrap, index < dash!.members.length - 1 && styles.memberRowBorder]}
                  >
                    <MemberRow
                      member={m}
                      isSelf={isSelf}
                      canRemove={canRemove}
                      onRemove={() => handleRemoveMember(m)}
                      removing={pendingRemoveUid === m.user_id}
                    />
                  </View>
                )
              })}
            </View>

            {dash!.pendingInvitations.length > 0 && dash!.isOwner ? (
              <>
                <Text style={styles.sectionTitle}>{t('family.section.pending')}</Text>
                <View style={styles.membersList}>
                  {dash!.pendingInvitations.map((inv) => (
                    <View key={inv.id} style={styles.pendingRow}>
                      <Text style={styles.memberName}>{inv.display_name ?? inv.email ?? '-'}</Text>
                      <Text style={styles.memberMeta}>
                        {t('family.section.expires', {
                          date: new Date(inv.expires_at).toLocaleDateString(language),
                        })}
                      </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EBE0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 44,
    height: 44,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  memberName: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: INK,
  },
  memberMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    marginTop: 2,
  },
  memberRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#722F3712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRemoveBtnDisabled: {
    opacity: 0.5,
  },
  memberStatsLine: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
  },
  statNum: {
    fontFamily: 'DMSans_600SemiBold',
    color: INK,
  },
  statUnit: {
    color: SUBTLE,
  },
  statDot: {
    color: '#D4C4B8',
  },
  pendingRow: { padding: 14 },
  noFamilyScrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 32,
  },
  invitationsSection: {
    marginBottom: 24,
  },
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  invitationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EBE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 19,
    color: WINE,
    marginBottom: 6,
  },
  invitationTitleFamilyName: {
    fontSize: 19,
    fontWeight: 'bold',
    fontFamily: 'DMSerifDisplay_600Bold',
    color: WINE,
  },
  invitationSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: INK,
    lineHeight: 20,
    marginBottom: 6,
  },
  invitationDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: SUBTLE,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 6,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  invitationBtn: {
    flex: 1,
    height: 46,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationAcceptBtn: {
    backgroundColor: WINE,
  },
  invitationAcceptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  invitationDeclineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D4C4B8',
  },
  invitationDeclineText: {
    color: INK,
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  invitationBtnDisabled: {
    opacity: 0.6,
  },
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
