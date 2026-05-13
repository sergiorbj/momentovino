import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'
import it from './locales/it.json'
import ptBR from './locales/pt-BR.json'
import ptPT from './locales/pt-PT.json'
import { setStoredLanguage } from './storage'
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from './types'

let initialized = false

/**
 * Always boot in English while App Store Connect copy is being prepared in
 * en-only. Picker selections still apply for the current session, but the
 * next launch resets to `en`. Restore the stored/device-locale resolution
 * once multi-language content is shipping.
 */
export async function initI18n(): Promise<LanguageCode> {
  const language: LanguageCode = 'en'

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
