import { View, Text, TouchableOpacity, SafeAreaView, Dimensions, StyleSheet } from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

const { width } = Dimensions.get('window')
const SCANNER_SIZE = width * 0.72

export default function ScannerScreen() {
  const [flashOn, setFlashOn] = useState(false)

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan Wine</Text>
          <TouchableOpacity
            onPress={() => setFlashOn(!flashOn)}
            style={[styles.flashBtn, flashOn && styles.flashBtnActive]}
          >
            <Ionicons name="flash" size={20} color={flashOn ? '#D4A574' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Scanner viewfinder */}
        <View style={styles.scannerArea}>
          <View style={[styles.viewfinder, { width: SCANNER_SIZE, height: SCANNER_SIZE * 1.1 }]}>
            <View style={styles.viewfinderBg} />

            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Center hint */}
            <View style={styles.hint}>
              <Text style={styles.bottleEmoji}>🍾</Text>
              <Text style={styles.hintText}>Position wine label{'\n'}here</Text>
            </View>
          </View>
        </View>

        {/* Scan button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.scanBtn} activeOpacity={0.85}>
            <Ionicons name="camera" size={22} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Scan Wine</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const CORNER_SIZE = 36
const BORDER_WIDTH = 3
const BORDER_COLOR = '#722F37'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontFamily: 'DMSans_600SemiBold', color: '#FFFFFF' },
  flashBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2D2520',
    justifyContent: 'center', alignItems: 'center',
  },
  flashBtnActive: { backgroundColor: '#3D2E20' },
  scannerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  viewfinderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 30, 20, 0.5)',
    borderRadius: 4,
  },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: BORDER_COLOR },
  topLeft: { top: 0, left: 0, borderTopWidth: BORDER_WIDTH, borderLeftWidth: BORDER_WIDTH, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: BORDER_WIDTH, borderRightWidth: BORDER_WIDTH, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: BORDER_WIDTH, borderLeftWidth: BORDER_WIDTH, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER_WIDTH, borderRightWidth: BORDER_WIDTH, borderBottomRightRadius: 8 },
  hint: { alignItems: 'center', gap: 12 },
  bottleEmoji: { fontSize: 64 },
  hintText: {
    color: '#9CA3AF', fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center', lineHeight: 22,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  scanBtn: {
    backgroundColor: '#722F37', borderRadius: 50, height: 56,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  scanBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
