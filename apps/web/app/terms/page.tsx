import type { Metadata } from 'next'
import { LegalPageView } from '@/components/legal/legal-page'
import { termsOfServiceEn, termsOfServicePtBr } from '@/lang/terms-of-service'

export const metadata: Metadata = {
  title: 'Terms of Service | MomentoVino',
  description:
    'The rules that govern the use of the MomentoVino app and website.',
}

export default function TermsPage() {
  return (
    <LegalPageView
      documents={{
        en: termsOfServiceEn,
        'pt-br': termsOfServicePtBr,
      }}
    />
  )
}
