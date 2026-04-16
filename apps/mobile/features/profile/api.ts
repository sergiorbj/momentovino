import { getApiBaseUrl } from '../../lib/api-base'
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
  bio: string | null
  avatar_url: string | null
  language: 'en' | 'pt-BR'
  notifications_enabled: boolean
  created_at: string
  updated_at: string
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

export async function updateSettings(input: UpdateSettingsInput): Promise<{ profile: ProfileRow }> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/profile/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not update settings (${res.status})`)
  }
  return res.json() as Promise<{ profile: ProfileRow }>
}
