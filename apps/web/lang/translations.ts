export const translations = {
  en: {
    nav: {
      resources: 'Features',
      howItWorks: 'How It Works',
      families: 'Families',
      downloadFree: 'Download Free',
    },
    hero: {
      headline: 'Every bottle tells a story.',
      headlineHighlight: 'Save yours.',
      description:
        "You don't need to be a sommelier to create wine memories. Scan, record and share special moments with your family.",
      downloadFree: 'Download Free',
      seeHowItWorks: 'See how it works',
    },
    socialProof: {
      rating: '4.9',
      appStore: 'on App Store',
      moments: '+10,000',
      momentsLabel: 'moments',
      madeFor: 'Made',
      families: 'for families',
    },
    footer: {
      tagline: 'Every bottle tells a story. Save yours.',
      legalHeading: 'Legal',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contactHeading: 'Contact',
      copyright: 'BERNARDI TECH LTDA. All rights reserved.',
    },
  },
  'pt-br': {
    nav: {
      resources: 'Recursos',
      howItWorks: 'Como Funciona',
      families: 'Famílias',
      downloadFree: 'Baixar Grátis',
    },
    hero: {
      headline: 'Cada garrafa conta uma história.',
      headlineHighlight: 'Guarde a sua.',
      description:
        'Você não precisa ser sommelier para criar memórias com vinho. Escaneie, registre e compartilhe momentos especiais com sua família.',
      downloadFree: 'Baixar Grátis',
      seeHowItWorks: 'Ver como funciona',
    },
    socialProof: {
      rating: '4.9',
      appStore: 'na App Store',
      moments: '+10.000',
      momentsLabel: 'momentos',
      madeFor: 'Feito',
      families: 'para famílias',
    },
    footer: {
      tagline: 'Cada garrafa conta uma história. Guarde a sua.',
      legalHeading: 'Legal',
      privacy: 'Política de Privacidade',
      terms: 'Termos de Serviço',
      contactHeading: 'Contato',
      copyright: 'BERNARDI TECH LTDA. Todos os direitos reservados.',
    },
  },
} as const

export type Locale = keyof typeof translations
export type Translations = (typeof translations)[Locale]

export const locales: Locale[] = ['en', 'pt-br']
export const defaultLocale: Locale = 'en'

export function getTranslations(locale: Locale): Translations {
  return translations[locale]
}

