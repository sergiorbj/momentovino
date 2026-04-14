import Constants from 'expo-constants'

const DEFAULT_API_BASE = 'http://localhost:3000/api'

/**
 * Base URL for Next.js route handlers (`/api/...`), without a trailing slash.
 * In `__DEV__`, if `EXPO_PUBLIC_API_URL` points to localhost but Metro reports a LAN host
 * (physical device / Expo Go), we rewrite to that host so the phone can reach your machine.
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE).replace(/\/+$/, '')

  if (!__DEV__) {
    return raw
  }

  const hostUri = Constants.expoConfig?.hostUri
  const devHost = hostUri?.split(':')[0]?.trim()
  if (!devHost) {
    return raw
  }

  const metroIsLoopback = /^(localhost|127\.0\.0\.1)$/i.test(devHost)
  const envUsesLoopback = /localhost|127\.0\.0\.1/.test(raw)

  if (!envUsesLoopback || metroIsLoopback) {
    return raw
  }

  const normalized = raw.includes('://') ? raw : `http://${raw}`
  const m = normalized.match(/^(\w+):\/\/(?:localhost|127\.0\.0\.1)(?::(\d+))?(\/.*)?$/i)
  if (!m) {
    return raw
  }
  const protocol = m[1].toLowerCase() === 'https' ? 'https' : 'http'
  const port = m[2] ?? (protocol === 'https' ? '443' : '3000')
  const pathAndQuery = m[3] ?? ''
  return `${protocol}://${devHost}:${port}${pathAndQuery}`
}
