import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useMoments } from '../../features/moments/hooks'
import type { MomentWithWines } from '../../features/moments/api'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const BROWN = '#5C4033'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={12}
          color={WINE}
        />
      ))}
    </View>
  )
}

function MomentCard({ item }: { item: MomentWithWines }) {
  const firstWine = item.wines[0]
  const extraWines = item.wines.length - 1

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/moments/${item.id}`)}
    >
      {item.cover_photo_url ? (
        <Image source={{ uri: item.cover_photo_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Image
            source={require('../../assets/glass.png')}
            style={styles.thumbPlaceholderIcon}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.location_name} · {formatDate(item.happened_at)}
        </Text>
        {firstWine && (
          <View style={styles.wineChipRow}>
            <View style={styles.wineChip}>
              <Image
                source={require('../../assets/glass.png')}
                style={styles.wineChipIcon}
                resizeMode="contain"
              />
              <Text style={styles.wineChipText} numberOfLines={1}>{firstWine.name}</Text>
            </View>
            {extraWines > 0 && (
              <View style={styles.wineExtraChip}>
                <Text style={styles.wineExtraChipText}>+{extraWines}</Text>
              </View>
            )}
          </View>
        )}
        {item.rating != null && <Stars rating={item.rating} />}
      </View>
    </TouchableOpacity>
  )
}

export default function MomentsListScreen() {
  const { moments, loading, refresh } = useMoments()

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Moments</Text>
        </View>

        {loading && moments.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={WINE} />
          </View>
        ) : (
          <FlatList
            data={moments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MomentCard item={item} />}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                tintColor={WINE}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="globe-outline" size={56} color={SUBTLE} />
                <Text style={styles.emptyTitle}>No moments yet</Text>
                <Text style={styles.emptyText}>
                  Your wine memories will appear here.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => router.push('/moments/new')}
                >
                  <Text style={styles.emptyCtaText}>+ Register your first moment</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
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
  listContent: { padding: 20, paddingBottom: 40 },
  separator: { height: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: {
    width: 72,
    alignSelf: 'stretch',
    borderRadius: 12,
    backgroundColor: '#E5D5C5',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  thumbPlaceholderIcon: { width: 32, height: 32, tintColor: WINE },
  wineChipIcon: { width: 14, height: 14, tintColor: WINE },
  cardBody: { flex: 1, justifyContent: 'center', gap: 6 },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: INK,
  },
  cardMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: SUBTLE,
  },
  wineChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  wineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  wineChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: WINE,
    flexShrink: 1,
  },
  wineExtraChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FDF2F4',
  },
  wineExtraChipText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: WINE,
  },
  stars: { flexDirection: 'row', gap: 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 24,
    color: BROWN,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    color: SUBTLE,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: WINE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 8,
  },
  emptyCtaText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
})
