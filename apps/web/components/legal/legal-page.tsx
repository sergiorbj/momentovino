'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { LegalDocument } from '@/lang/privacy-policy'
import { defaultLocale, locales, type Locale } from '@/lang/translations'

function detectLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLocales = navigator.languages || [navigator.language]
    for (const raw of browserLocales) {
      const lc = raw.toLowerCase()
      if (locales.includes(lc as Locale)) return lc as Locale
      if (lc.startsWith('pt')) return 'pt-br'
    }
    for (const raw of browserLocales) {
      if (raw.toLowerCase().startsWith('en')) return 'en'
    }
  }
  return defaultLocale
}

type Props = {
  documents: Record<Locale, LegalDocument>
}

export function LegalPageView({ documents }: Props) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    setLocale(detectLocale())
  }, [])

  const doc = useMemo(() => documents[locale], [documents, locale])

  const labels = useMemo(
    () =>
      locale === 'pt-br'
        ? { effective: 'Em vigor desde', back: 'Voltar à página inicial' }
        : { effective: 'Effective', back: 'Back to home' },
    [locale]
  )

  return (
    <div className="min-h-screen bg-linen text-mauve-bark">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-wine-plum transition-opacity hover:opacity-70"
          >
            ← {labels.back}
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={
                  l === locale
                    ? 'rounded-full bg-wine-plum px-3 py-1 text-white'
                    : 'rounded-full px-3 py-1 text-mauve-bark/70 transition-colors hover:text-wine-plum'
                }
              >
                {l === 'pt-br' ? 'PT-BR' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        <header className="mb-10 border-b border-mauve-bark/15 pb-8">
          <h1 className="font-serif text-4xl text-wine-plum lg:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-mauve-bark/70">
            {labels.effective}: {doc.effectiveDate}
          </p>
        </header>

        <div className="space-y-6">
          {doc.intro.map((p, i) => (
            <p key={`intro-${i}`} className="text-base leading-relaxed text-mauve-bark">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-12 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="font-serif text-2xl text-chocolate">{section.title}</h2>
              {section.paragraphs.map((p, i) => (
                <p
                  key={`${section.title}-${i}`}
                  className="text-base leading-relaxed text-mauve-bark"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
