import { marketingSiteOrigin } from '../marketing-urls'
import { supabase } from '../supabase'
import { configurePurchases } from '../purchases'
import {
  friendlySignUpError,
  isAccountAlreadyExistsAuthError,
  isSamePasswordAsCurrentAuthError,
} from './registrationErrors'

async function rebindRevenueCat(): Promise<void> {
  const { data } = await supabase.auth.getUser()
  const userId = data.user?.id
  if (!userId) return
  try {
    await configurePurchases(userId)
  } catch (err) {
    console.warn('[auth/email] RevenueCat re-bind failed', err)
  }
}

export type EmailSignUpInput = {
  email: string
  password: string
  fullName?: string
}

export type EmailAuthOutcome =
  | { kind: 'success' }
  | { kind: 'needs_email_confirmation' }
  | { kind: 'already_exists' }
  | { kind: 'invalid_credentials' }
  | { kind: 'error'; message: string }

/**
 * Sign up with email + password. If a Supabase session already exists
 * (e.g. the anonymous bootstrap session), prefer `updateUser` so the
 * existing user_id is preserved (avoids orphaning RC's appUserID and any
 * rows already written under the anon id). Falls back to `signUp` when
 * there is no session at all.
 *
 * Returns `needs_email_confirmation` when the project requires email
 * confirmation (Supabase default for `signUp`). The session is not yet
 * established at that point — UI should tell the user to check their inbox.
 */
export async function signUpWithEmail(input: EmailSignUpInput): Promise<EmailAuthOutcome> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const fullName = input.fullName?.trim() ?? ''

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const haveAnonSession = !!sessionData.session?.user?.is_anonymous

    if (haveAnonSession) {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
        data: fullName ? { full_name: fullName } : undefined,
      })
      if (error) {
        // Happens when the user already called `updateUser` with this password earlier in the
        // same session (e.g. old onboarding step + save-account). Credentials are already set.
        if (isSamePasswordAsCurrentAuthError(error)) {
          await rebindRevenueCat()
          return { kind: 'success' }
        }
        throw error
      }
      // updateUser triggers a confirmation email if Confirm Email is enabled.
      // The session stays anonymous until the link is opened.
      if (data.user?.is_anonymous) return { kind: 'needs_email_confirmation' }
      await rebindRevenueCat()
      return { kind: 'success' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    })
    if (error) throw error
    if (!data.session) return { kind: 'needs_email_confirmation' }
    await rebindRevenueCat()
    return { kind: 'success' }
  } catch (err) {
    if (isAccountAlreadyExistsAuthError(err)) return { kind: 'already_exists' }
    return { kind: 'error', message: friendlySignUpError(err) }
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<EmailAuthOutcome> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (/invalid\s+login\s+credentials/i.test(error.message)) {
        return { kind: 'invalid_credentials' }
      }
      throw error
    }
    await rebindRevenueCat()
    return { kind: 'success' }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Could not sign in' }
  }
}

/**
 * Send a password-reset email. Uses an **https** redirect on the Next.js site
 * (`/auth/reset-callback`) so the link works in the system browser; that page
 * forwards tokens to `momentovino://reset-password` for the in-app screen.
 *
 * Add the callback URL(s) to Supabase → Authentication → URL Configuration →
 * Redirect URLs, e.g. `http://localhost:3000/auth/reset-callback` and your
 * production origin + `/auth/reset-callback`.
 */
export async function sendPasswordResetEmail(email: string): Promise<EmailAuthOutcome> {
  try {
    const target = email.trim().toLowerCase()
    const redirectTo = `${marketingSiteOrigin()}/auth/reset-callback`
    const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo })
    if (error) throw error
    return { kind: 'success' }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Could not send reset email' }
  }
}

/**
 * Set a new password for the currently logged-in user. Used by the
 * reset-password screen after the deep-link recovery session is active.
 */
export async function updatePassword(newPassword: string): Promise<EmailAuthOutcome> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return { kind: 'success' }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Could not update password' }
  }
}
