import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { useMomentDetail } from '../../features/moments/hooks'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const BROWN = '#5C4033'

const { width: SCREEN_W } = Dimensions.get('window')
const COVER_H = 260

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={20}
          color={WINE}
        />
      ))}
      <Text style={styles.ratingLabel}>{rating}/5</Text>
    </View>
  )
}

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { moment, wine, photos, loading } = useMomentDetail(id ?? '')

  if (loading || !moment) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={WINE} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        {moment.cover_photo_url ? (
          <View>
            <Image
              source={{ uri: moment.cover_photo_url }}
              style={styles.cover}
            />
            <SafeAreaView edges={['top']} style={styles.backOverlay}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={WINE} />
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView edges={['top']} style={styles.noCoverHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={WINE} />
            </TouchableOpacity>
          </SafeAreaView>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{moment.title}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={SUBTLE} />
            <Text style={styles.infoText}>{formatDate(moment.happened_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={SUBTLE} />
            <Text style={styles.infoText}>{moment.location_name}</Text>
          </View>

          {moment.description ? (
            <Text style={styles.description}>{moment.description}</Text>
          ) : null}

          {moment.rating != null && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Rating</Text>
              <Stars rating={moment.rating} />
            </View>
          )}

          {wine && (
            <View style={styles.wineCard}>
              <View style={styles.wineHeader}>
                <Ionicons name="wine" size={18} color={WINE} />
                <Text style={styles.wineName}>{wine.name}</Text>
              </View>
              <View style={styles.wineMeta}>
                {wine.producer && <Chip label={wine.producer} />}
                {wine.vintage && <Chip label={String(wine.vintage)} />}
                {wine.region && <Chip label={wine.region} />}
                {wine.type && <Chip label={wine.type} />}
              </View>
            </View>
          )}

          {photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Photos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScroll}
              >
                {photos.map((p) => (
                  <Image
                    key={p.id}
                    source={{ uri: p.url }}
                    style={styles.galleryPhoto}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  cover: {
    width: SCREEN_W,
    height: COVER_H,
  },
  backOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  noCoverHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 24, gap: 16 },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: BROWN,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: SUBTLE,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: INK,
    lineHeight: 22,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: SUBTLE,
    marginLeft: 6,
  },
  wineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  wineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wineName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: INK,
    flex: 1,
  },
  wineMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: WINE,
  },
  photosScroll: { gap: 12 },
  galleryPhoto: {
    width: 180,
    height: 140,
    borderRadius: 14,
    backgroundColor: '#E5D5C5',
  },
})
