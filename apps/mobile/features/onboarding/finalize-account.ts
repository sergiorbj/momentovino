import type { QueryClient } from '@tanstack/react-query'

import { claimUsername } from '../profile/api'
import { markOnboardingCompleted } from './state'
import { getSelections, resetSelections } from './selections'
import { seedStarterJournal } from './seed'
import { queryKeys } from '../../lib/query-keys'
import { supabase } from '../../lib/supabase'

export type FinalizeAccountInput = {
  qc: QueryClient
  /** Shown in the app and passed to `claim_username` as the handle seed. */
  displayName: string
}

function fallbackDesiredFromUser(meta: Record<string, unknown>, email: string | undefined): string {
  const prefix = email?.includes('@') ? email.split('@')[0]?.trim() : ''
  if (prefix) return prefix
  const fullName = meta.full_name
  const name = meta.name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  if (typeof name === 'string' && name.trim()) return name.trim()
  return 'user'
}

/**
 * After auth (email or OAuth): persist display name, seed starter journal,
 * claim @username, invalidate caches, clear onboarding selections.
 * Caller navigates away after await (e.g. `router.replace`).
 */
export async function finalizeAccount({ qc, displayName }: FinalizeAccountInput): Promise<void> {
  const { error: refreshErr } = await supabase.auth.refreshSession()
  if (refreshErr) console.warn('[finalizeAccount] refreshSession', refreshErr.message)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData.user
  if (userErr || !user) throw new Error(userErr?.message ?? 'No authenticated user')

  await qc.invalidateQueries({ queryKey: queryKeys.entitlement })

  const trimmed = displayName.trim()
  if (trimmed.length >= 2) {
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id)
    if (profileErr) console.warn('[finalizeAccount] display_name', profileErr.message)

    const { error: metaErr } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    if (metaErr) console.warn('[finalizeAccount] user metadata full_name', metaErr.message)
  }

  const { pickedWineKeys } = getSelections()
  if (pickedWineKeys.length > 0) {
    try {
      await seedStarterJournal(pickedWineKeys)
    } catch (err) {
      console.warn('[finalizeAccount] seedStarterJournal failed', err)
      throw err instanceof Error ? err : new Error('Could not save your starter journal.')
    }
  }

  try {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const desired =
      trimmed.length >= 2 ? trimmed : fallbackDesiredFromUser(meta, user.email ?? undefined)
    await claimUsername(desired)
  } catch (err) {
    console.warn('[finalizeAccount] claimUsername', err)
  }

  await qc.invalidateQueries({ queryKey: ['moments'] })
  await qc.invalidateQueries({ queryKey: ['wines'] })
  await qc.invalidateQueries({ queryKey: queryKeys.profile })
  await qc.invalidateQueries({ queryKey: queryKeys.momentStats })
  await qc.invalidateQueries({ queryKey: queryKeys.winesCount })

  await markOnboardingCompleted()
  resetSelections()
}
