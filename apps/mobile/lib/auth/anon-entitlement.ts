import { supabase } from '../supabase'
import { getApiBaseUrl } from '../api-base'

/**
 * Snapshot of an anonymous Supabase session. Used by Apple/Google sign-in:
 * `signInWithIdToken` swaps the session to a brand-new user_id, which would
 * orphan any Pro entitlement bought during onboarding. Capture the anon
 * access token *before* the swap so the post-swap call to
 * `/api/claim-anon-entitlement` can prove ownership and migrate the row.
 *
 * Returns null when the current session isn't anonymous — callers should
 * just skip the claim step in that case.
 */
export async function captureAnonSession(): Promise<{ userId: string; accessToken: string } | null> {
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return null
  if (!session.user.is_anonymous) return null
  if (!session.access_token) return null
  return { userId: session.user.id, accessToken: session.access_token }
}

/**
 * Move a Pro entitlement from `anonAccessToken`'s user to the currently
 * authenticated user via the server (service-role write). Both tokens are
 * verified server-side, so the caller has to actually own the anon session.
 *
 * Silent no-op when the server reports nothing to migrate — the only thing
 * we surface back is the booleans we get; UI doesn't need to differentiate.
 */
export async function claimAnonEntitlement(anonAccessToken: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const newToken = sessionData.session?.access_token
  if (!newToken) return false

  try {
    const res = await fetch(`${getApiBaseUrl()}/claim-anon-entitlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newToken}`,
      },
      body: JSON.stringify({ anon_token: anonAccessToken }),
    })
    if (!res.ok) {
      console.warn('[claim-anon-entitlement] server returned', res.status)
      return false
    }
    const json = (await res.json()) as { migrated?: boolean }
    return !!json.migrated
  } catch (err) {
    console.warn('[claim-anon-entitlement] network error', err)
    return false
  }
}
