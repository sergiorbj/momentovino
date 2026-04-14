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
import type { MomentWithWine } from '../../features/moments/api'

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

function MomentCard({ item }: { item: MomentWithWine }) {
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
          <Ionicons name="wine" size={24} color={WINE} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.location_name} · {formatDate(item.happened_at)}
        </Text>
        {item.wine_name && (
          <View style={styles.wineChip}>
            <Ionicons name="wine-outline" size={11} color={WINE} />
            <Text style={styles.wineChipText} numberOfLines={1}>{item.wine_name}</Text>
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
          <View style={styles.iconBtn} />
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
  listContent: { padding: 20, paddingBottom: 40 },
  separator: { height: 12 },
  card: {
    flexDirection: 'row',
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
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E5D5C5',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, justifyContent: 'center', gap: 3 },
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
  wineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  wineChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: WINE,
  },
  stars: { flexDirection: 'row', gap: 2, marginTop: 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: BROWN,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
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
    fontSize: 14,
    color: '#FFFFFF',
  },
})
