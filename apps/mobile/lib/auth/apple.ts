import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'

import { supabase } from '../supabase'
import { configurePurchases } from '../purchases'

export type AppleSignInOutcome =
  | { kind: 'success'; userId: string }
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

/**
 * Native Sign in with Apple → exchange Apple identity token for a Supabase
 * session via `signInWithIdToken`. The Supabase user_id may change here:
 * if the current session is anonymous, it is replaced by the Apple-linked
 * user. Any DB rows written under the anon user_id become orphaned, so
 * call this BEFORE seeding any per-user data.
 *
 * Apple only returns `fullName` on the very first sign-in for a given
 * (Apple ID, app) pair. We capture it and write to `profiles.display_name`
 * immediately so future sign-ins (which omit the name) don't lose it.
 */
export async function signInWithApple(): Promise<AppleSignInOutcome> {
  if (Platform.OS !== 'ios') {
    return { kind: 'unavailable', message: 'Sign in with Apple only works on iOS.' }
  }

  const available = await isAppleSignInAvailable()
  if (!available) {
    return {
      kind: 'unavailable',
      message: 'Sign in with Apple is not available on this device.',
    }
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    if (!credential.identityToken) {
      return { kind: 'error', message: 'Apple did not return an identity token.' }
    }

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim()

    const { data: signInData, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error || !signInData.user) {
      return { kind: 'error', message: error?.message ?? 'Could not sign in with Apple.' }
    }

    const userId = signInData.user.id

    if (fullName) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('id', userId)
      if (profileErr) console.warn('[auth/apple] profile name update:', profileErr.message)
    }

    // RC was configured with the previous (anonymous) user id at boot. Re-bind
    // it to the Apple-linked user so the entitlement transfers.
    try {
      await configurePurchases(userId)
    } catch (rcErr) {
      console.warn('[auth/apple] RevenueCat re-bind failed', rcErr)
    }

    return { kind: 'success', userId }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'ERR_REQUEST_CANCELED') {
      return { kind: 'cancelled' }
    }
    const message = err instanceof Error ? err.message : 'Apple sign-in failed'
    return { kind: 'error', message }
  }
}
