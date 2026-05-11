import AsyncStorage from '@react-native-async-storage/async-storage'

import { isLanguageCode, type LanguageCode } from './types'

const KEY = '@momentovino/language_v1'

export async function getStoredLanguage(): Promise<LanguageCode | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return isLanguageCode(raw) ? raw : null
  } catch {
    return null
  }
}

export async function setStoredLanguage(code: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(KEY, code)
}

export async function clearStoredLanguage(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
