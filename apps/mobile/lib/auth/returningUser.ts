import { supabase } from '../supabase'

/**
 * How many `moments` the signed-in user already has (for this session’s user_id).
 * Used to avoid re-seeding the starter “onboarding” journal when the same person
 * signs in again (e.g. email account first, then “Continue with Google” with the
 * same email) after Supabase links identities on one user.
 */
export async function getExistingMomentCount(): Promise<number> {
  const { count, error } = await supabase
    .from('moments')
    .select('id', { count: 'exact', head: true })
  if (error) {
    console.warn('[auth/returningUser] getExistingMomentCount:', error.message)
    return 0
  }
  return count ?? 0
}
