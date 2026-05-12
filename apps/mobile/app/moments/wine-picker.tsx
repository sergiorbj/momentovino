import { useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { WineRowAvatar } from '../../components/WineRowAvatar'
import { setPendingWinePick } from '../../features/moments/wine-picker-handoff'
import { useWinesCount, useWinesSearch } from '../../features/wines/hooks'
import {
  bestLabelPhotoInCluster,
  clusterWinesForDisplay,
  type WineCluster,
} from '../../features/wines/similarity'

const WINE_C = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'

export default function WinePickerScreen() {
  // `editMomentId` is set only when the picker was opened from the moment edit
  // screen; it's forwarded to the scanner so a "scan a new wine" return knows to
  // dismiss back to the edit screen rather than `/moments/new`.
  const { editMomentId } = useLocalSearchParams<{ editMomentId?: string }>()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 220)
    return () => clearTimeout(handle)
  }, [query])

  const winesQuery = useWinesSearch(debouncedQuery)
  const countQuery = useWinesCount()

  const results = winesQuery.data ?? []
  const totalWines = countQuery.data ?? null
  const loading = winesQuery.isFetching

  const clusters = useMemo(() => clusterWinesForDisplay(results), [results])

  const emptyLabel = useMemo(() => {
    if (loading) return ''
    if (query.trim().length === 0) return 'No wines yet. Scan a bottle to add your first one.'
    return `No wines match "${query}".`
  }, [loading, query])

  const select = (cluster: WineCluster) => {
    const w = cluster.canonical
    setPendingWinePick({ wineId: w.id, wineName: w.name, isExistingWine: true })
    router.back()
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE_C} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Select wine</Text>
            {totalWines !== null ? <Text style={styles.headerCount}>{totalWines}</Text> : null}
          </View>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <View style={styles.body}>
          <TouchableOpacity
            style={styles.scanCta}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/scanner',
                params: {
                  forMoment: '1',
                  ...(editMomentId ? { editMomentId } : {}),
                },
              })
            }
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
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => select(item)}
                  activeOpacity={0.85}
                >
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
                      {[w.producer, w.vintage, w.country, w.type].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  body: { flex: 1, padding: 20 },
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
})
