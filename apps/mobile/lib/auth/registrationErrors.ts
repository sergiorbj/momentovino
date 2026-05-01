/**
 * Heuristic match for “this email is already in use” from Supabase Auth
 * (`signUp`, `updateUser`, `signInWithOtp`, etc.) — copy varies by version.
 */
export function isAccountAlreadyExistsAuthError(err: unknown): boolean {
  const m = (err as Error)?.message ?? String(err)
  return /already\s+(be\s+)?registered|email\s*address.*already|already\s+in\s+use|user\s+already|duplicate|identities?.*exists|account.*exists/i.test(
    m
  )
}

/** Supabase returns this on `updateUser({ password })` when the new password matches the current one. */
export function isSamePasswordAsCurrentAuthError(err: unknown): boolean {
  const m = (err as Error)?.message ?? String(err)
  return /different from the old password/i.test(m)
}

/** Maps raw Auth errors to copy that makes sense on signup (not password-reset screens). */
export function friendlySignUpError(err: unknown): string {
  if (isSamePasswordAsCurrentAuthError(err)) {
    return (
      'This password is already set on this session. Use a different password, ' +
      'or continue with Apple or Google.'
    )
  }
  return err instanceof Error ? err.message : 'Could not create account'
}
