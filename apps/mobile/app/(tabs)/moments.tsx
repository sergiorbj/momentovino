import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 0.72, 290)

const MOMENT_PINS = [
  { id: 1, emoji: '🍷', top: '28%', left: '32%' },
  { id: 2, emoji: '🍷', top: '43%', left: '50%' },
  { id: 3, emoji: '🥂', top: '30%', left: '62%' },
  { id: 4, emoji: '🍾', top: '60%', left: '28%' },
  { id: 5, emoji: '🥂', top: '62%', left: '56%' },
]

export default function MomentsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Moments</Text>
          <TouchableOpacity style={styles.searchBtn}>
            <Ionicons name="search" size={20} color="#722F37" />
          </TouchableOpacity>
        </View>

        {/* Globe visualization */}
        <View style={styles.globeWrapper}>
          <View style={[styles.globe, { width: GLOBE_SIZE, height: GLOBE_SIZE, borderRadius: GLOBE_SIZE / 2 }]}>
            {/* Lighter continent blobs */}
            <View style={[styles.blob, { width: 120, height: 75, top: '22%', left: '10%' }]} />
            <View style={[styles.blob, { width: 100, height: 65, bottom: '18%', right: '8%' }]} />
            <View style={[styles.blob, { width: 70, height: 50, top: '55%', left: '20%' }]} />

            {/* Moment pins */}
            {MOMENT_PINS.map((pin) => (
              <View
                key={pin.id}
                style={[styles.pin, { top: pin.top as any, left: pin.left as any }]}
              >
                <Text style={styles.pinEmoji}>{pin.emoji}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>23</Text>
            <Text style={styles.statLabel}>Moments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>47</Text>
            <Text style={styles.statLabel}>Wines</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>+ Register New Moment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EBE0' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#722F37',
  },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  globeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globe: {
    backgroundColor: '#2D6A4F',
    overflow: 'hidden',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    backgroundColor: '#40916C',
    borderRadius: 999,
  },
  pin: {
    position: 'absolute',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#722F37',
    borderWidth: 2, borderColor: '#F5EBE0',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: -18, marginTop: -18,
  },
  pinEmoji: { fontSize: 16 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 30,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 13,
    color: '#C2703E',
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  statDivider: {
    width: 1, height: 40,
    backgroundColor: '#E5D5C5',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  ctaBtn: {
    backgroundColor: '#5C4033',
    borderRadius: 50, height: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
