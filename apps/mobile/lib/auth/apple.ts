import * as AppleAuthentication from 'expo-apple-authentication'

import { supabase } from '../supabase'

export type AppleSignInOutcome =
  | { kind: 'success' }
  | { kind: 'cancelled' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

// Opens the native "Sign in with Apple" sheet and hands the returned identity
// token to Supabase. Returns `unavailable` on non-Apple hardware / simulators
// without Apple ID so callers can hide the button gracefully.
export async function signInWithApple(): Promise<AppleSignInOutcome> {
  try {
    const available = await AppleAuthentication.isAvailableAsync()
    if (!available) return { kind: 'unavailable' }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    if (!credential.identityToken) {
      return { kind: 'error', message: 'Apple did not return an identity token.' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error) return { kind: 'error', message: error.message }

    return { kind: 'success' }
  } catch (err) {
    // `ERR_REQUEST_CANCELED` is thrown when the user dismisses the sheet.
    const code = (err as { code?: string }).code
    if (code === 'ERR_REQUEST_CANCELED') return { kind: 'cancelled' }

    const message = err instanceof Error ? err.message : 'Apple sign-in failed'
    return { kind: 'error', message }
  }
}
