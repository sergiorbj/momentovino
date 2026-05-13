import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { isLanguageCode, type LanguageCode } from './types'

export { useTranslation } from 'react-i18next'

const WINE_TYPE_CODES = new Set([
  'RED',
  'WHITE',
  'ROSE',
  'SPARKLING',
  'DESSERT',
  'FORTIFIED',
])

/**
 * Wine type codes from the API/DB (e.g. RED) → copy from `common.wineTypes.*`
 * in each locale file. Unknown codes are shown as-is.
 */
export function wineTypeLabel(type: string | null | undefined, t: TFunction): string {
  if (!type?.trim()) return ''
  const code = type.trim().toUpperCase()
  if (!WINE_TYPE_CODES.has(code)) return type.trim()
  const key = `common.wineTypes.${code}`
  const out = t(key)
  return typeof out === 'string' && out !== key ? out : type.trim()
}

/**
 * Current active language as a typed union (narrowed from i18next's `string`).
 * Falls back to "en" if i18next has not yet been initialised or somehow holds
 * a value outside the supported set.
 */
export function useLanguage(): LanguageCode {
  const { i18n } = useTranslation()
  return isLanguageCode(i18n.language) ? i18n.language : 'en'
}
