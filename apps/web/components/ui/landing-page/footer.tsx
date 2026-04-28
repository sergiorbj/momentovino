'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from '@/hooks/use-translations'

export function Footer() {
  const t = useTranslations()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-mauve-bark/15 bg-linen">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="MomentoVino"
                width={56}
                height={56}
                className="h-12 w-12"
              />
              <span className="font-serif text-[20px] tracking-tight">
                <span className="text-wine-plum">Momento</span>
                <span className="text-chocolate">Vino</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-mauve-bark/80">
              {t.footer.tagline}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-base text-chocolate">
              {t.footer.legalHeading}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-mauve-bark transition-colors hover:text-wine-plum"
                >
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-mauve-bark transition-colors hover:text-wine-plum"
                >
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-base text-chocolate">
              {t.footer.contactHeading}
            </h3>
            <a
              href="mailto:sergiobernardi.dev@gmail.com"
              className="text-sm text-mauve-bark transition-colors hover:text-wine-plum"
            >
              sergiobernardi.dev@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-mauve-bark/15 pt-6 text-xs text-mauve-bark/70">
          © {year} {t.footer.copyright}
        </div>
      </div>
    </footer>
  )
}

export default Footer
