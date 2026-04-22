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
