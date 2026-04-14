import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

import { attachWineLabelPhoto, createWineViaApi } from '../../features/scanner/api'
import { takeLabelPhotoForResult, type PendingLabelPhoto } from '../../features/scanner/pending-label-photo'
import { emitScannerReset } from '../../lib/scanner-reset'

const WINE = '#722F37'
const INK = '#3F2A2E'
const SUBTLE = '#C2703E'
const BG = '#F5EBE0'
const BROWN = '#5C4033'

export default function ScanResultScreen() {
  const params = useLocalSearchParams<{
    name: string
    producer: string
    vintage: string
    region: string
    country: string
    type: string
    description: string
  }>()

  const [labelPhoto] = useState<PendingLabelPhoto | null>(() => takeLabelPhotoForResult())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    emitScannerReset()
    return () => {
      emitScannerReset()
    }
  }, [])

  const saveWine = async (andCreateMoment: boolean) => {
    try {
      setSaving(true)

      const wine = await createWineViaApi({
        name: params.name ?? '',
        producer: params.producer || null,
        vintage: params.vintage ? Number(params.vintage) : null,
        region: params.region || null,
        country: params.country || null,
        type: params.type || null,
      })

      if (labelPhoto) {
        try {
          await attachWineLabelPhoto(wine.id, labelPhoto.uri, labelPhoto.mimeType)
        } catch (photoErr) {
          console.error('Wine label upload failed:', photoErr)
          Alert.alert(
            'Wine saved without photo',
            photoErr instanceof Error
              ? `${photoErr.message}\n\nCheck that migration 0004 (bucket wine-labels) is applied in Supabase.`
              : 'Could not upload the label image.',
          )
        }
      }

      if (andCreateMoment) {
        router.replace({
          pathname: '/moments/new',
          params: { wineId: wine.id, wineName: wine.name },
        })
      } else {
        Alert.alert('Wine added', `${wine.name} has been saved to your collection.`, [
          { text: 'OK', onPress: () => router.replace('/(tabs)/wines') },
        ])
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save wine')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={WINE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wine Identified</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroWrap}>
            {labelPhoto ? (
              <Image source={{ uri: labelPhoto.uri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="wine" size={36} color={WINE} />
              </View>
            )}
          </View>

          <Text style={styles.wineName}>{params.name}</Text>

          {params.description ? (
            <Text style={styles.description}>{params.description}</Text>
          ) : null}

          <View style={styles.card}>
            {params.producer ? <InfoRow label="Producer" value={params.producer} /> : null}
            {params.vintage ? <InfoRow label="Vintage" value={params.vintage} /> : null}
            {params.region ? <InfoRow label="Region" value={params.region} /> : null}
            {params.country ? <InfoRow label="Country" value={params.country} /> : null}
            {params.type ? <InfoRow label="Type" value={params.type} /> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => saveWine(false)}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Add to my wines</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => saveWine(true)}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles-outline" size={20} color={WINE} />
            <Text style={styles.btnSecondaryText}>Add wine + create moment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
    paddingVertical: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: WINE,
  },
  scroll: { padding: 24, alignItems: 'center' },
  heroWrap: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 280,
    aspectRatio: 0.75,
    backgroundColor: '#FDF2F4',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wineName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: BROWN,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: SUBTLE,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: INK,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: WINE,
  },
  btnSecondaryText: {
    color: WINE,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
