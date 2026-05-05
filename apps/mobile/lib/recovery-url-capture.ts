import * as Linking from 'expo-linking'

/**
 * Captures the password-recovery deep-link URL as early as possible.
 *
 * **Critical:** `Linking.getInitialURL()` must run only ONCE per cold start on
 * many platforms — a second caller often gets `null`. All launch logic should
 * await `initialLaunchUrlPromise` instead of calling `getInitialURL` again.
 *
 * Warm launches use `Linking.addEventListener('url', …)`.
 */

let cachedUrl: string | null = null
const subscribers = new Set<(url: string) => void>()

/** Merge `?query` and `#fragment` into one param bag (same rules as `recoveryHref`). */
function collectLinkParams(url: string): URLSearchParams {
  const params = new URLSearchParams()
  const queryIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')
  const queryEnd =
    hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : url.length

  if (queryIndex >= 0) {
    const qs = new URLSearchParams(url.slice(queryIndex + 1, queryEnd))
    qs.forEach((v, k) => params.set(k, v))
  }
  if (hashIndex >= 0) {
    const hs = new URLSearchParams(url.slice(hashIndex + 1))
    hs.forEach((v, k) => params.set(k, v))
  }
  return params
}

/**
 * True when this URL carries a Supabase **password recovery** session payload.
 *
 * Supabase `redirect_to=momentovino://` (root scheme only) is valid: after
 * `/auth/v1/verify` the app opens as `momentovino://#…type=recovery…` or
 * `momentovino://?code=…` — **no** `reset-password` path, so we must not rely on
 * that substring alone.
 */
export function isPasswordRecoveryDeepLink(url: string | null | undefined): url is string {
  if (typeof url !== 'string' || !url.trim()) return false
  if (url.toLowerCase().includes('reset-password')) return true

  const merged = collectLinkParams(url)
  if (merged.get('type')?.toLowerCase() === 'recovery') return true

  try {
    const parsed = Linking.parse(url)
    if (parsed.scheme?.toLowerCase() !== 'momentovino') return false
    const path = (parsed.path ?? '').replace(/^\/+|\/+$/g, '')
    if (path !== '' && path !== '/') return false
    // PKCE: verify endpoint redirects with `?code=` onto the bare scheme URL.
    if (merged.has('code')) return true
  } catch {
    return false
  }

  return false
}

function publish(url: string) {
  cachedUrl = url
  for (const cb of subscribers) {
    try {
      cb(url)
    } catch {
      // ignore subscriber errors
    }
  }
}

/** Single cold-start read — share this, never call `getInitialURL` elsewhere for launch. */
export const initialLaunchUrlPromise: Promise<string | null> = Linking.getInitialURL()
  .then((url) => {
    if (isPasswordRecoveryDeepLink(url)) publish(url)
    return url ?? null
  })
  .catch(() => null)

Linking.addEventListener('url', (ev) => {
  if (isPasswordRecoveryDeepLink(ev.url)) publish(ev.url)
})

export function getCachedRecoveryUrl(): string | null {
  return cachedUrl
}

export function subscribeRecoveryUrl(cb: (url: string) => void): () => void {
  subscribers.add(cb)
  if (cachedUrl) {
    try {
      cb(cachedUrl)
    } catch {
      // ignore
    }
  }
  return () => {
    subscribers.delete(cb)
  }
}

/**
 * Convert any captured recovery URL (which may have `?query`, `#hash`, or
 * both) into an in-app href. expo-router strips hashes during navigation, so
 * we flatten everything into query params.
 */
export function recoveryHref(url: string): string {
  const params = collectLinkParams(url)
  const tail = params.toString()
  return tail.length > 0 ? `/reset-password?${tail}` : '/reset-password'
}
