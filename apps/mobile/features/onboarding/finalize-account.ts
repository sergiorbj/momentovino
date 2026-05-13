import type { QueryClient } from '@tanstack/react-query'

import { claimUsername } from '../profile/api'
import { createMoment } from '../moments/api'
import { attachWineLabelPhoto, createWineViaApi } from '../scanner/api'
import { markOnboardingCompleted } from './state'
import { resetSelections } from './selections'
import { getCapture, resetCapture } from './onboarding-capture'
import { prefetchCoreDataAsync } from '../../lib/prefetch'
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
 * Persists the wine + moment captured during onboarding under the freshly
 * authenticated user. Runs post-auth (and post-paywall) so Apple Sign-In's
 * user_id swap doesn't orphan the rows.
 */
async function persistOnboardingCapture(): Promise<void> {
  const { wine, moment } = getCapture()
  if (!wine || !moment) return
  // Onboarding funnel is strictly one scanned bottle → one persisted wine row.

  const wineRow = await createWineViaApi({
    name: wine.name,
    producer: wine.producer || null,
    region: wine.region || null,
    country: wine.country || null,
    type: wine.type || null,
  })

  if (wine.labelPhoto) {
    try {
      await attachWineLabelPhoto(
        wineRow.id,
        wine.labelPhoto.uri,
        wine.labelPhoto.mimeType,
      )
    } catch (err) {
      console.warn('[finalizeAccount] attachWineLabelPhoto failed', err)
    }
  }

  await createMoment({ ...moment, wineIds: [wineRow.id] })
}

/**
 * After auth (email or OAuth): persist display name, persist onboarding
 * capture (wine + moment), claim @username, invalidate caches, clear
 * onboarding state. Caller navigates away after await (e.g. `router.replace`).
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

  try {
    await persistOnboardingCapture()
  } catch (err) {
    console.warn('[finalizeAccount] persistOnboardingCapture failed', err)
    throw err instanceof Error ? err : new Error('Could not save your first moment.')
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
  await qc.invalidateQueries({ queryKey: queryKeys.family })
  await qc.invalidateQueries({ queryKey: queryKeys.myInvitations })
  await prefetchCoreDataAsync(qc)

  await markOnboardingCompleted()
  resetSelections()
  resetCapture()
}
