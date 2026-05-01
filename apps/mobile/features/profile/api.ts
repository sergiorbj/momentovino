import { getApiBaseUrl } from '../../lib/api-base'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No active session')
  return token
}

export type ProfileRow = {
  id: string
  display_name: string
  username: string
  bio: string | null
  avatar_url: string | null
  language: 'en' | 'pt-BR'
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/
export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

/**
 * Atomically assigns a username for the current user, retrying with a
 * random 4-digit suffix on collision. Safe to call on every app start for
 * authenticated non-anonymous users missing a username.
 */
export async function claimUsername(desired?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('claim_username', {
    desired: desired ?? '',
  })
  if (error) throw new Error(error.message || 'Could not claim username')
  return String(data)
}

export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken.')
    this.name = 'UsernameTakenError'
  }
}

export class UsernameFormatError extends Error {
  constructor() {
    super('3–20 lowercase letters, numbers, dots or underscores.')
    this.name = 'UsernameFormatError'
  }
}

/**
 * Sets a user-picked username. Throws `UsernameTakenError` on collision or
 * `UsernameFormatError` on invalid input.
 */
export async function setUsername(newUsername: string): Promise<string> {
  const { data, error } = await supabase.rpc('set_username', {
    new_username: newUsername,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('username_taken')) throw new UsernameTakenError()
    if (msg.includes('invalid_format')) throw new UsernameFormatError()
    throw new Error(msg || 'Could not update username')
  }
  return String(data)
}

export type ProfileStats = {
  moments: number
  wines: number
  family: number
}

export type ProfileDashboard = {
  profile: ProfileRow
  stats: ProfileStats
}

export async function getProfile(): Promise<ProfileDashboard> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Failed to load profile (${res.status})`)
  }
  return res.json() as Promise<ProfileDashboard>
}

export type UpdateProfileInput = {
  display_name?: string
  bio?: string | null
  avatar_url?: string | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<{ profile: ProfileRow }> {
  const token = await getAccessToken()
  const body: Record<string, unknown> = {}
  if (input.display_name !== undefined) body.display_name = input.display_name
  if (input.bio !== undefined) body.bio = input.bio
  if (input.avatar_url !== undefined) body.avatar_url = input.avatar_url
  const res = await fetch(`${getApiBaseUrl()}/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not update profile (${res.status})`)
  }
  return res.json() as Promise<{ profile: ProfileRow }>
}

export type UpdateSettingsInput = {
  language?: 'en' | 'pt-BR'
  notifications_enabled?: boolean
}

const SETTINGS_LANGUAGES: ReadonlySet<NonNullable<UpdateSettingsInput['language']>> = new Set([
  'en',
  'pt-BR',
])

/**
 * Updates `profiles.language` and/or `profiles.notifications_enabled` via Supabase
 * (RLS), not the Python `/api/profile/settings` route — avoids 404 when the
 * app points `EXPO_PUBLIC_API_URL` at Next (`:3000`) instead of the Flask shim
 * (`:5328`), and when hosted routing does not expose that subpath.
 */
export async function updateSettings(input: UpdateSettingsInput): Promise<{ profile: ProfileRow }> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw new Error('No authenticated user')

  const uid = userData.user.id
  const patch: Database['public']['Tables']['profiles']['Update'] = {}

  if (input.language !== undefined) {
    if (!SETTINGS_LANGUAGES.has(input.language)) {
      throw new Error('Language must be en or pt-BR')
    }
    patch.language = input.language
  }
  if (input.notifications_enabled !== undefined) {
    patch.notifications_enabled = input.notifications_enabled
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('No settings to update')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', uid)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Could not update settings')
  if (!data) throw new Error('Profile not found')

  return { profile: data as unknown as ProfileRow }
}
