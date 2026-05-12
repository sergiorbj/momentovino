import AsyncStorage from '@react-native-async-storage/async-storage'

const ATLAS_HINT_KEY = '@momentovino/moments_atlas_hint_seen_v1'

export async function hasSeenAtlasHint(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ATLAS_HINT_KEY)) === 'true'
  } catch {
    return false
  }
}

export async function markAtlasHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ATLAS_HINT_KEY, 'true')
  } catch {
    // Persisting the hint is best-effort: a failure here only means the user
    // may see the hint again next launch, which is acceptable.
  }
}

export async function resetAtlasHint(): Promise<void> {
  await AsyncStorage.removeItem(ATLAS_HINT_KEY)
}
