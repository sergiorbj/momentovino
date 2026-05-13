import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { WineRowAvatar } from '../../components/WineRowAvatar'
import { useTranslation, wineTypeLabel } from '../../features/i18n/hooks'
import {
  useDeleteWines,
  useWinesCount,
  useWinesSearch,
} from '../../features/wines/hooks'
import {
  bestLabelPhotoInCluster,
  clusterWinesForDisplay,
  pickWineIdsToDelete,
  type WineCluster,
} from '../../features/wines/similarity'

const WINE_C = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

type DeleteModalState =
  | null
  | { mode: 'confirm'; cluster: WineCluster }
  | { mode: 'quantity'; cluster: WineCluster }

export default function WinesScreen() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 220)
    return () => clearTimeout(handle)
  }, [query])

  const winesQuery = useWinesSearch(debouncedQuery)
  const countQuery = useWinesCount()
  const deleteMutation = useDeleteWines()

  const results = winesQuery.data ?? []
  const totalWines = countQuery.data ?? null
  const loading = winesQuery.isFetching

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>(null)
  const [qtyToRemove, setQtyToRemove] = useState(1)
  const deleting = deleteMutation.isPending

  const clusters = useMemo(() => clusterWinesForDisplay(results), [results])

  const emptyLabel = useMemo(() => {
    if (loading) return ''
    if (query.trim().length === 0) return 'No wines yet. Scan a bottle to add your first one.'
    return `No wines match "${query}".`
  }, [loading, query])

  const openDeleteFlow = useCallback((cluster: WineCluster) => {
    if (cluster.members.length === 1) {
      setDeleteModal({ mode: 'confirm', cluster })
    } else {
      setQtyToRemove(1)
      setDeleteModal({ mode: 'quantity', cluster })
    }
  }, [])

  const closeDeleteModal = useCallback(() => {
    setDeleteModal(null)
  }, [])

  const runDelete = useCallback(
    async (cluster: WineCluster, count: number) => {
      const ids = pickWineIdsToDelete(cluster, count)
      if (ids.length === 0) {
        Alert.alert('Error', 'Could not resolve which wine to delete.')
        return
      }
      try {
        await deleteMutation.mutateAsync(ids)
        setDeleteModal(null)
      } catch (err) {
        console.error(err)
        Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove wine.')
      }
    },
    [deleteMutation],
  )

  const qtyCluster = deleteModal?.mode === 'quantity' ? deleteModal.cluster : null
  const qtyMax = qtyCluster?.members.length ?? 1

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Wines</Text>
            {totalWines !== null ? <Text style={styles.headerCount}>{totalWines}</Text> : null}
          </View>
        </View>

        <View style={styles.body}>
          <TouchableOpacity
            style={styles.scanCta}
            onPress={() => router.push('/(tabs)/scanner')}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            <Text style={styles.scanCtaText}>Scan to add a wine</Text>
          </TouchableOpacity>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={SUBTLE} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search wines"
              placeholderTextColor="#A98B7E"
              style={styles.search}
              autoCapitalize="none"
            />
          </View>

          <FlatList<WineCluster>
            data={clusters}
            keyExtractor={(c) => c.canonical.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            ListEmptyComponent={
              loading ? null : (
                <View style={styles.empty}>
                  <Image
                    source={require('../../assets/glass.png')}
                    style={styles.emptyIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>{emptyLabel}</Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const w = item.canonical
              const photo = bestLabelPhotoInCluster(item.members)
              const dup = item.members.length > 1
              return (
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <WineRowAvatar labelPhotoUrl={photo} size={40} accent={WINE_C} />
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTitleRow}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {w.name}
                      </Text>
                      {dup ? (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>×{item.members.length}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.rowMeta}>
                      {[w.producer, w.vintage, w.country, w.type ? wineTypeLabel(w.type, t) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => openDeleteFlow(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Remove wine"
                  >
                    <Ionicons name="trash-outline" size={22} color={SUBTLE} />
                  </TouchableOpacity>
                </View>
              )
            }}
          />
        </View>
      </SafeAreaView>

      <Modal visible={deleteModal !== null} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={closeDeleteModal} disabled={deleting} />
          <View style={styles.modalCard} collapsable={false} pointerEvents="box-none">
            {deleteModal?.mode === 'confirm' ? (
              <View pointerEvents="auto">
                <Text style={styles.modalTitle}>Remove this wine?</Text>
                <Text style={styles.modalSubtitle}>
                  {deleteModal.cluster.canonical.name}
                  {'\n'}
                  This can't be undone.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                    onPress={closeDeleteModal}
                    disabled={deleting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnDanger, deleting && styles.modalBtnDisabled]}
                    onPress={() => void runDelete(deleteModal.cluster, 1)}
                    disabled={deleting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Remove wine"
                  >
                    {deleting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalBtnDangerText}>Remove</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            {deleteModal?.mode === 'quantity' ? (
              <View pointerEvents="auto">
                <Text style={styles.modalTitle}>How many to remove?</Text>
                <Text style={styles.modalWineName} numberOfLines={2}>
                  {deleteModal.cluster.canonical.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {deleteModal.cluster.members.length} bottle
                  {deleteModal.cluster.members.length === 1 ? '' : 's'} total. The most recently added are removed
                  first.
                </Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, qtyToRemove <= 1 && styles.qtyBtnDisabled]}
                    onPress={() => setQtyToRemove((q) => Math.max(1, q - 1))}
                    disabled={deleting || qtyToRemove <= 1}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="remove" size={22} color={WINE_C} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{qtyToRemove}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, qtyToRemove >= qtyMax && styles.qtyBtnDisabled]}
                    onPress={() => setQtyToRemove((q) => Math.min(qtyMax, q + 1))}
                    disabled={deleting || qtyToRemove >= qtyMax}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={22} color={WINE_C} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                    onPress={closeDeleteModal}
                    disabled={deleting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnDanger, deleting && styles.modalBtnDisabled]}
                    onPress={() => void runDelete(deleteModal.cluster, qtyToRemove)}
                    disabled={deleting}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm remove wines"
                  >
                    {deleting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalBtnDangerText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingRight: 12,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: WINE_C,
  },
  headerCount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 28,
    color: SUBTLE,
  },
  body: { flex: 1, padding: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WINE_C,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scanCtaText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  search: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: INK,
  },
  divider: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  rowLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  trashBtn: {
    flexShrink: 0,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: INK },
  countBadge: {
    backgroundColor: WINE_C,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: { fontSize: 12, fontFamily: 'DMSans_700Bold', color: '#FFFFFF' },
  rowMeta: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: SUBTLE, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  emptyIcon: { width: 60, height: 60, tintColor: SUBTLE },
  emptyText: { fontFamily: 'DMSans_400Regular', color: SUBTLE, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: WINE_C,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
  },
  emptyBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold' },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: 'rgba(63, 42, 46, 0.45)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    zIndex: 10,
    elevation: 24,
  },
  modalTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: WINE_C,
    marginBottom: 10,
  },
  modalWineName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: INK,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: SUBTLE,
    lineHeight: 20,
    marginBottom: 20,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 22,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 28,
    color: INK,
    minWidth: 48,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 110,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDisabled: { opacity: 0.65 },
  modalBtnGhost: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C4B8',
  },
  modalBtnGhostText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: INK,
  },
  modalBtnDanger: { backgroundColor: WINE_C },
  modalBtnDangerText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
})
