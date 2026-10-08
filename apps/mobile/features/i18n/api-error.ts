import type { TFunction } from 'i18next'

import { ApiError } from '../../lib/api-error'
import { i18n } from './config'

export function serverErrorKey(code: string | null | undefined): string | null {
  if (!code) return null
  const key = `errors.server.${code}`
  return i18n.exists(key) ? key : null
}

/**
 * Server messages are English-only, so anything without a known error code
 * falls back to the caller's translated message instead of leaking it.
 */
export function translateApiError(err: unknown, t: TFunction, fallbackKey: string): string {
  const key = err instanceof ApiError ? serverErrorKey(err.code) : null
  if (!key) console.warn('[api-error]', err)
  return t(key ?? fallbackKey)
}
