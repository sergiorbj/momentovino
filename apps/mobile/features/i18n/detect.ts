import { getLocales } from 'expo-localization'

import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from './types'

/**
 * Map the device's preferred locale (BCP-47, e.g. "pt-BR", "es-419", "fr-FR")
 * to one of the supported language codes. Falls back by language family:
 *
 *   pt-BR, pt        → pt-BR
 *   pt-PT (+ others) → pt-PT
 *   es-*             → es
 *   it-*             → it
 *   en-*, anything   → en
 */
export function resolveDeviceLanguage(): LanguageCode {
  const locales = getLocales()
  for (const locale of locales) {
    const matched = matchTag(locale.languageTag, locale.languageCode ?? null)
    if (matched) return matched
  }
  return DEFAULT_LANGUAGE
}

function matchTag(tag: string | null, languageCode: string | null): LanguageCode | null {
  if (!tag) return null
  if (isLanguageCode(tag)) return tag
  const lang = (languageCode ?? tag.split('-')[0] ?? '').toLowerCase()
  if (lang === 'pt') {
    return tag.toLowerCase().startsWith('pt-br') ? 'pt-BR' : 'pt-PT'
  }
  if (lang === 'es') return 'es'
  if (lang === 'it') return 'it'
  if (lang === 'en') return 'en'
  return null
}
