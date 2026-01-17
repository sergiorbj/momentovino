'use client'

import { useMemo } from 'react'
import { locales, defaultLocale, getTranslations, type Locale, type Translations } from '@/lang/translations'

function getLocale(): Locale {
  // 1. Check browser language FIRST (before cookie) to detect user's actual preference
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLocales = navigator.languages || [navigator.language]

    // First pass: check for Portuguese
    for (const browserLocale of browserLocales) {
      const locale = browserLocale.toLowerCase()
      
      // Check exact match
      if (locales.includes(locale as Locale)) {
        return locale as Locale
      }
      
      // Check language only (pt -> pt-br) - PRIORITY
      if (locale.startsWith('pt')) {
        return 'pt-br'
      }
    }
    
    // Second pass: check for English only if no Portuguese found
    for (const browserLocale of browserLocales) {
      const locale = browserLocale.toLowerCase()
      
      if (locale.startsWith('en')) {
        return 'en'
      }
    }
  }

  // 2. Check cookie (user preference) - only if browser language didn't match
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const cookieLocale = cookies['NEXT_LOCALE']
    
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      return cookieLocale as Locale
    }
  }

  // 3. Default locale
  return defaultLocale
}

export function useTranslations(): Translations {
  const locale = useMemo(() => getLocale(), [])
  return useMemo(() => getTranslations(locale), [locale])
}
