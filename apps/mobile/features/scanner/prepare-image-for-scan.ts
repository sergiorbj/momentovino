import * as ImageManipulator from 'expo-image-manipulator'
import { Image } from 'react-native'

/** Keeps JSON body under typical serverless limits (e.g. Vercel ~4.5MB). */
const MAX_LONG_EDGE = 1600
const JPEG_QUALITY = 0.72

/**
 * Downscales and re-encodes a label photo before POST /scan-wine (base64 JSON).
 * Gallery picks can be huge; full-res camera shots also blow past 413 limits.
 */
export async function prepareImageForWineScan(localUri: string): Promise<{ uri: string; mimeType: string }> {
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      localUri,
      (w, h) => resolve({ width: w, height: h }),
      (e) => reject(e),
    )
  })

  const longest = Math.max(width, height)
  const actions =
    longest <= MAX_LONG_EDGE
      ? []
      : width >= height
        ? [{ resize: { width: MAX_LONG_EDGE } as const }]
        : [{ resize: { height: MAX_LONG_EDGE } as const }]

  const out = await ImageManipulator.manipulateAsync(localUri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  })

  return { uri: out.uri, mimeType: 'image/jpeg' }
}
