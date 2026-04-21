import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'

import { supabase } from '../supabase'

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

let configured = false

// Must be called once at app start before any sign-in attempt. `webClientId`
// is the audience Supabase validates against, so it is required even on iOS.
export function configureGoogleSignIn(): void {
  if (configured) return

  if (!iosClientId || !webClientId) {
    console.warn(
      '[auth/google] Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — Google sign-in disabled.'
    )
    return
  }

  GoogleSignin.configure({
    iosClientId,
    webClientId,
  })
  configured = true
}

export type GoogleSignInOutcome =
  | { kind: 'success' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }

// Opens the native Google sign-in prompt, exchanges the returned ID token with
// Supabase, and leaves the supabase client holding a live session on success.
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  if (!configured) {
    return {
      kind: 'error',
      message: 'Google sign-in is not configured. Check your .env file.',
    }
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
    const result = await GoogleSignin.signIn()

    // Response shape differs between v15 and v16; normalise the two shapes.
    const idToken =
      (result as { data?: { idToken?: string | null } }).data?.idToken ??
      (result as { idToken?: string | null }).idToken ??
      null

    if (!idToken) {
      return { kind: 'error', message: 'Google did not return an ID token.' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) return { kind: 'error', message: error.message }

    return { kind: 'success' }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS
    ) {
      return { kind: 'cancelled' }
    }
    const message = err instanceof Error ? err.message : 'Google sign-in failed'
    return { kind: 'error', message }
  }
}
