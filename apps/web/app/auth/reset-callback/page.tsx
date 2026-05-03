'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const WINE = '#722F37'
const INK = '#3F2A2E'
const BG = '#F5EBE0'

/**
 * Supabase recovery emails must use an **https** `redirect_to` (in the allow
 * list). This page loads in the browser with `?code=` (PKCE) or `#access_token=`
 * (implicit), then forwards the same payload to the native app scheme so
 * `apps/mobile/app/reset-password.tsx` can call `exchangeCodeForSession` /
 * `setSession`. Opening `momentovino://…` directly from desktop mail shows a
 * blank tab because browsers do not render custom schemes.
 */
function ResetCallbackBody() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'redirecting' | 'invalid'>('redirecting')

  useEffect(() => {
    const code = searchParams.get('code')
    const hash = typeof window !== 'undefined' ? window.location.hash : ''

    if (code) {
      window.location.replace(`momentovino://reset-password?code=${encodeURIComponent(code)}`)
      return
    }

    if (hash && (hash.includes('access_token') || hash.includes('refresh_token'))) {
      window.location.replace(`momentovino://reset-password${hash}`)
      return
    }

    setStatus('invalid')
  }, [searchParams])

  if (status === 'invalid') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        <p style={{ color: INK, fontSize: 16, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          This reset link is invalid or has expired. Request a new one from the MomentoVino app under
          Forgot password.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      <p style={{ color: WINE, fontSize: 20, fontWeight: 600, marginBottom: 12 }}>MomentoVino</p>
      <p style={{ color: INK, fontSize: 16, textAlign: 'center', maxWidth: 420, lineHeight: 1.5 }}>
        Opening the app to finish resetting your password…
      </p>
      <p style={{ color: INK, fontSize: 14, opacity: 0.85, marginTop: 20, textAlign: 'center', maxWidth: 420 }}>
        If nothing happens, open this link on the phone where MomentoVino is installed. On a computer,
        the app link cannot open automatically.
      </p>
    </div>
  )
}

export default function AuthResetCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: INK,
          }}
        >
          Loading…
        </div>
      }
    >
      <ResetCallbackBody />
    </Suspense>
  )
}
