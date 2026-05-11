import { useTranslation } from 'react-i18next'

import { isLanguageCode, type LanguageCode } from './types'

export { useTranslation } from 'react-i18next'

/**
 * Current active language as a typed union (narrowed from i18next's `string`).
 * Falls back to "en" if i18next has not yet been initialised or somehow holds
 * a value outside the supported set.
 */
export function useLanguage(): LanguageCode {
  const { i18n } = useTranslation()
  return isLanguageCode(i18n.language) ? i18n.language : 'en'
}
