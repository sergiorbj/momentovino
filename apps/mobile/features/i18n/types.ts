export const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'pt-PT', 'es', 'it'] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export const LANGUAGE_DISPLAY: Record<LanguageCode, { label: string; flag: string }> = {
  en: { label: 'English (US)', flag: '🇺🇸' },
  'pt-BR': { label: 'Português (BR)', flag: '🇧🇷' },
  'pt-PT': { label: 'Português (PT)', flag: '🇵🇹' },
  es: { label: 'Español', flag: '🇪🇸' },
  it: { label: 'Italiano', flag: '🇮🇹' },
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}
