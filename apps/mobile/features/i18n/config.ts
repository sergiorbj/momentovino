import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resolveDeviceLanguage } from './detect'
import en from './locales/en.json'
import es from './locales/es.json'
import it from './locales/it.json'
import ptBR from './locales/pt-BR.json'
import ptPT from './locales/pt-PT.json'
import { getStoredLanguage, setStoredLanguage } from './storage'
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from './types'

let initialized = false

/**
 * Initialise i18next once with the user's preferred language. Resolution
 * order:
 *   1. AsyncStorage cache (manual override the user picked previously)
 *   2. Device locale via expo-localization
 *   3. DEFAULT_LANGUAGE ("en")
 *
 * Returns the resolved language so callers can mirror it into other state.
 */
export async function initI18n(): Promise<LanguageCode> {
  const stored = await getStoredLanguage()
  const language = stored ?? resolveDeviceLanguage()

  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        'pt-BR': { translation: ptBR },
        'pt-PT': { translation: ptPT },
        es: { translation: es },
        it: { translation: it },
      },
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    initialized = true
  } else if (i18n.language !== language) {
    await i18n.changeLanguage(language)
  }
  return language
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  if (!isLanguageCode(code)) return
  await setStoredLanguage(code)
  if (initialized) await i18n.changeLanguage(code)
}

export { i18n }
