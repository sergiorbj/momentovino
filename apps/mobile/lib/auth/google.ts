import Constants from 'expo-constants'

import { supabase } from '../supabase'
import { configurePurchases } from '../purchases'

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

// Expo Go ships a fixed set of native modules and does not include
// `@react-native-google-signin/google-signin`. Detect the runtime so we can
// skip native access entirely and surface a clear message instead of crashing.
const isExpoGo = Constants.appOwnership === 'expo'

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (opts: { iosClientId?: string; webClientId?: string }) => void
    hasPlayServices: (opts?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>
    signIn: () => Promise<unknown>
  }
  statusCodes: { SIGN_IN_CANCELLED: string; IN_PROGRESS: string }
}

let nativeModule: GoogleSigninModule | null = null
let configured = false

/** Display name from the native Google Sign-In result (not always mirrored in Supabase metadata). */
function displayNameFromGoogleSignInResult(result: unknown): string | null {
  const r = result as Record<string, unknown>
  const data = r.data as Record<string, unknown> | undefined
  const user = (data?.user ?? r.user) as Record<string, unknown> | undefined
  if (!user) return null
  const name = user.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  const given = user.givenName
  const family = user.familyName
  const parts = [given, family].filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  if (parts.length > 0) return parts.join(' ')
  return null
}

function loadNative(): GoogleSigninModule | null {
  if (nativeModule) return nativeModule
  if (isExpoGo) return null
  try {
    nativeModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule
    return nativeModule
  } catch (err) {
    console.warn('[auth/google] Native module not linked:', err)
    return null
  }
}

export function configureGoogleSignIn(): void {
  if (configured) return

  if (isExpoGo) {
    console.warn('[auth/google] Running in Expo Go — Google sign-in disabled (needs dev client).')
    return
  }

  if (!iosClientId || !webClientId) {
    console.warn(
      '[auth/google] Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — Google sign-in disabled.'
    )
    return
  }

  const mod = loadNative()
  if (!mod) return

  mod.GoogleSignin.configure({ iosClientId, webClientId })
  configured = true
}

export type GoogleSignInOutcome =
  | { kind: 'success' }
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  if (isExpoGo) {
    return {
      kind: 'unavailable',
      message: 'Google sign-in only works in a dev client build, not Expo Go.',
    }
  }
  if (!configured) {
    return {
      kind: 'error',
      message: 'Google sign-in is not configured. Check your .env file.',
    }
  }

  const mod = loadNative()
  if (!mod) {
    return {
      kind: 'unavailable',
      message: 'Google sign-in native module is not available.',
    }
  }

  try {
    await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
    const result = await mod.GoogleSignin.signIn()

    const idToken =
      (result as { data?: { idToken?: string | null } }).data?.idToken ??
      (result as { idToken?: string | null }).idToken ??
      null

    if (!idToken) {
      return { kind: 'error', message: 'Google did not return an ID token.' }
    }

    // GoTrue checks: sha256(nonce you send) (hex) == `nonce` claim in the id token.
    // The iOS public Google Sign-In SDK does not let us supply a custom nonce, so
    // we do not have the *raw* secret to send — only a digest ends up in the JWT.
    // Passing the id_token's `nonce` claim back (as we used to) hashes it again
    // server-side and triggers "Nonces mismatch".
    //
    // For this sign-in method, enable **Skip nonce check** on the Google provider
    // in the Supabase dashboard (Auth → Providers → Google). A future option is
    // a custom OAuth path where you set nonce digest in Google and pass the raw
    // nonce to signInWithIdToken (e.g. Universal Sign-In, or AuthSession).
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) {
      const msg = error.message
      if (/nonce/i.test(msg)) {
        return {
          kind: 'error',
          message: `${msg} In the Supabase dashboard, open Auth → Providers → Google and turn on "Skip nonce check" for native Google Sign-In (this library cannot provide the raw nonce).`,
        }
      }
      return { kind: 'error', message: msg }
    }

    const googleName = displayNameFromGoogleSignInResult(result)
    if (googleName && data.user?.id) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: googleName })
        .eq('id', data.user.id)
      if (profileErr) console.warn('[auth/google] profile name update:', profileErr.message)
    }

    // Re-bind RevenueCat to the (possibly new) user_id so the entitlement
    // tracks the correct app account. Webhook handles TRANSFER on the server.
    if (data.user?.id) {
      try {
        await configurePurchases(data.user.id)
      } catch (rcErr) {
        console.warn('[auth/google] RevenueCat re-bind failed', rcErr)
      }
    }

    return { kind: 'success' }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (
      code === mod.statusCodes.SIGN_IN_CANCELLED ||
      code === mod.statusCodes.IN_PROGRESS
    ) {
      return { kind: 'cancelled' }
    }
    const message = err instanceof Error ? err.message : 'Google sign-in failed'
    return { kind: 'error', message }
  }
}
