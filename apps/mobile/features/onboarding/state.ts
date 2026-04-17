import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@momentovino/onboarding_completed_v1'

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true'
  } catch {
    return false
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true')
}

export async function resetOnboardingState(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
