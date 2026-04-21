import Constants from 'expo-constants'

import { supabase } from '../supabase'

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

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) return { kind: 'error', message: error.message }

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
