import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

import WireframeGlobe from '../../components/globe/WireframeGlobe'
import type { MomentPin } from '../../components/globe/types'

const { width } = Dimensions.get('window')
const GLOBE_SIZE = Math.min(width * 0.78, 320)

const MOCK_PINS: MomentPin[] = [
  { id: '1', latitude: 48.86, longitude: 2.35, label: 'Paris' },
  { id: '2', latitude: 41.9, longitude: 12.5, label: 'Rome' },
  { id: '3', latitude: -33.9, longitude: 18.4, label: 'Cape Town' },
  { id: '4', latitude: 35.7, longitude: 139.7, label: 'Tokyo' },
  { id: '5', latitude: -34.6, longitude: -58.4, label: 'Buenos Aires' },
]

export default function MomentsScreen() {
  const handleGlobePress = () => {
    // TODO: navigate to moments list screen
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Moments</Text>
          <TouchableOpacity style={styles.searchBtn}>
            <Ionicons name="search" size={20} color="#722F37" />
          </TouchableOpacity>
        </View>

        <View style={styles.globeWrapper}>
          <WireframeGlobe
            pins={MOCK_PINS}
            onPress={handleGlobePress}
            config={{ size: GLOBE_SIZE }}
          />
        </View>

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
    color: '#5C4033',
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
