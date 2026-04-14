import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { router, useFocusEffect } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import Svg, { Defs, Mask, Rect } from 'react-native-svg'

import { scanWineImage } from '../../features/scanner/api'
import { setPendingLabelPhoto } from '../../features/scanner/pending-label-photo'
import { isScanError } from '../../features/scanner/types'
import { subscribeScannerReset } from '../../lib/scanner-reset'

const WINE = '#722F37'
const BG_DARK = '#1C1510'
const FRAME_ASPECT = 0.75
/** Same radius as the wine frame border and SVG hole mask. */
const FRAME_CORNER_RADIUS = 14

type PickedImage = { uri: string; mimeType: string }

export default function ScannerScreen() {
  const { width: winW, height: winH } = useWindowDimensions()
  const dimMaskId = useId().replace(/:/g, '')
  const cameraRef = useRef<CameraView>(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [tabFocused, setTabFocused] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [image, setImage] = useState<PickedImage | null>(null)
  const [scanning, setScanning] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setTabFocused(true)
      return () => setTabFocused(false)
    }, []),
  )

  useEffect(() => {
    return subscribeScannerReset(() => {
      setImage(null)
      setCameraReady(false)
      setScanning(false)
    })
  }, [])

  const cameraActive = tabFocused && !image

  const frameW = winW * 0.84
  const frameH = frameW / FRAME_ASPECT
  const frameLeft = (winW - frameW) / 2
  const frameTop = Math.max(0, (winH - frameH) / 2 - 32)

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to pick wine photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      setImage({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' })
    }
  }, [])

  const clearImage = useCallback(() => {
    setImage(null)
    setCameraReady(false)
  }, [])

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || capturing) return
    try {
      setCapturing(true)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      })
      if (photo?.uri) {
        setImage({ uri: photo.uri, mimeType: 'image/jpeg' })
      }
    } catch (err) {
      Alert.alert('Camera', err instanceof Error ? err.message : 'Could not take photo')
    } finally {
      setCapturing(false)
    }
  }, [cameraReady, capturing])

  const handleScan = useCallback(async () => {
    if (!image) return

    try {
      setScanning(true)
      const base64 = await FileSystem.readAsStringAsync(image.uri, {
        encoding: 'base64',
      })

      const result = await scanWineImage(base64, image.mimeType)

      if (isScanError(result)) {
        clearImage()
        Alert.alert('Could not identify', result.error)
        return
      }

      setPendingLabelPhoto({ uri: image.uri, mimeType: image.mimeType })

      router.push({
        pathname: '/scanner/result',
        params: {
          name: result.name,
          producer: result.producer ?? '',
          vintage: result.vintage != null ? String(result.vintage) : '',
          region: result.region ?? '',
          country: result.country ?? '',
          type: result.type ?? '',
          description: result.description ?? '',
        },
      })
    } catch (err) {
      Alert.alert('Scan failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setScanning(false)
    }
  }, [image, clearImage])

  const showLiveCamera = !image && permission?.granted

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {showLiveCamera ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          active={cameraActive}
          animateShutter
          onCameraReady={() => setCameraReady(true)}
        />
      ) : null}

      {!image ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {permission?.granted ? (
            <>
              <Svg
                pointerEvents="none"
                width={winW}
                height={winH}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <Mask
                    id={dimMaskId}
                    x={0}
                    y={0}
                    width={winW}
                    height={winH}
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                  >
                    <Rect width={winW} height={winH} fill="#ffffff" />
                    <Rect
                      x={frameLeft}
                      y={frameTop}
                      width={frameW}
                      height={frameH}
                      rx={FRAME_CORNER_RADIUS}
                      ry={FRAME_CORNER_RADIUS}
                      fill="#000000"
                    />
                  </Mask>
                </Defs>
                <Rect
                  width={winW}
                  height={winH}
                  fill="rgba(0,0,0,0.52)"
                  mask={`url(#${dimMaskId})`}
                />
              </Svg>
              <View
                pointerEvents="none"
                style={[
                  styles.frameBorder,
                  {
                    left: frameLeft,
                    top: frameTop,
                    width: frameW,
                    height: frameH,
                  },
                ]}
              />
            </>
          ) : (
            <View style={[styles.dim, StyleSheet.absoluteFill]} />
          )}
        </View>
      ) : null}

      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.title}>Scan Wine</Text>
          {!image ? (
            <Text style={styles.subtitle}>Align the label inside the frame, then capture</Text>
          ) : null}
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionWrap}>
            <View style={styles.permissionCard}>
              <Ionicons name="camera-outline" size={40} color="#FFFFFF" />
              <Text style={styles.permissionTitle}>Camera access</Text>
              <Text style={styles.permissionText}>
                The scanner opens the camera so you can photograph the label in one tap.
              </Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
                <Text style={styles.permissionBtnText}>Allow camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.permissionGallery} onPress={pickFromGallery} activeOpacity={0.85}>
                <Ionicons name="images-outline" size={20} color={WINE} />
                <Text style={styles.permissionGalleryText}>Choose from gallery instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.flex} />
            {image ? (
              <View style={styles.previewSection}>
                <View style={styles.previewWrap}>
                  <Image source={{ uri: image.uri }} style={styles.preview} />

                  {scanning && (
                    <View style={styles.scanningOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.scanningText}>Identifying wine...</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.clearBtn} onPress={clearImage}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.footer}>
          {image ? (
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={handleScan}
              disabled={scanning}
              activeOpacity={0.85}
            >
              {scanning ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.scanBtnText}>Scan this wine</Text>
                </>
              )}
            </TouchableOpacity>
          ) : permission?.granted ? (
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={styles.galleryOnly}
                onPress={pickFromGallery}
                activeOpacity={0.85}
                accessibilityLabel="Choose from gallery"
              >
                <Ionicons name="images" size={26} color="#FFFFFF" />
                <Text style={styles.galleryOnlyText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shutterOuter, (capturing || !cameraReady) && styles.shutterDisabled]}
                onPress={takePhoto}
                disabled={capturing || !cameraReady}
                activeOpacity={0.9}
                accessibilityLabel="Take photo"
              >
                {capturing ? (
                  <ActivityIndicator color={WINE} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>

              <View style={styles.gallerySpacer} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  safe: { flex: 1 },
  flex: { flex: 1 },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  frameBorder: {
    position: 'absolute',
    borderRadius: FRAME_CORNER_RADIUS,
    borderWidth: 2,
    borderColor: WINE,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },
  permissionWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(28,21,16,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(114,47,55,0.35)',
    gap: 12,
    alignItems: 'center',
  },
  permissionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: '#FFFFFF',
  },
  permissionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: WINE,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  permissionGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
  },
  permissionGalleryText: {
    color: WINE,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  previewSection: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: FRAME_ASPECT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  clearBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scanningText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  galleryOnlyText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  gallerySpacer: {
    flex: 1,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  scanBtn: {
    backgroundColor: WINE,
    borderRadius: 50,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
})
