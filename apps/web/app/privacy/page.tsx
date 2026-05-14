import type { Metadata } from 'next'
import { LegalPageView } from '@/components/legal/legal-page'
import { privacyPolicyEn, privacyPolicyPtBr } from '@/lang/privacy-policy'

export const metadata: Metadata = {
  title: 'Privacy Policy | MomentoVino',
  description:
    'How MomentoVino collects, uses, stores, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <LegalPageView
      documents={{
        en: privacyPolicyEn,
        'pt-br': privacyPolicyPtBr,
      }}
    />
  )
}
