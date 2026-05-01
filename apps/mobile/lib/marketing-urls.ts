/**
 * Legal pages live on the Next.js marketing site. Derive origin from
 * `EXPO_PUBLIC_API_URL` (strip trailing `/api`) so dev builds open localhost.
 */
export function marketingSiteOrigin(): string {
  const api = process.env.EXPO_PUBLIC_API_URL ?? ''
  const base = api.replace(/\/?api\/?$/i, '').replace(/\/+$/, '')
  return base.length > 0 ? base : 'https://momentovino.com'
}

export function privacyPolicyUrl(): string {
  return `${marketingSiteOrigin()}/privacy`
}

export function termsOfServiceUrl(): string {
  return `${marketingSiteOrigin()}/terms`
}
