import { getApiBaseUrl } from '../../lib/api-base'
import { supabase } from '../../lib/supabase'

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No active session')
  return token
}

export type FamilyRow = {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  description?: string | null
  photo_url?: string | null
}

export type FamilyMemberRow = {
  id: string
  family_id: string
  user_id: string
  role: 'admin' | 'member' | string
  joined_at: string
  email?: string | null
}

export type FamilyInvitationRow = {
  id: string
  email: string
  expires_at: string
  created_at: string
}

export type FamilyDashboard = {
  family: FamilyRow | null
  members: FamilyMemberRow[]
  pendingInvitations: FamilyInvitationRow[]
  isOwner: boolean
}

/** Match from GET /family/members/search (profile-style card on invite screen). */
export type FamilyInviteUserMatch = {
  user_id: string
  email: string
  display_name: string
  username: string
}

export async function getFamilyDashboard(): Promise<FamilyDashboard> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Failed to load family (${res.status})`)
  }
  return res.json() as Promise<FamilyDashboard>
}

export type CreateFamilyInput = {
  name: string
  description?: string | null
  photo_url?: string | null
}

export async function createFamily(input: CreateFamilyInput): Promise<{ family: FamilyRow }> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
      ...(input.description != null && input.description !== '' ? { description: input.description } : {}),
      ...(input.photo_url != null && input.photo_url !== '' ? { photo_url: input.photo_url } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not create family (${res.status})`)
  }
  return res.json() as Promise<{ family: FamilyRow }>
}

export type UpdateFamilyInput = {
  name?: string
  description?: string | null
  photo_url?: string | null
}

export async function updateFamily(input: UpdateFamilyInput): Promise<{ family: FamilyRow }> {
  const token = await getAccessToken()
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) body.name = input.name
  if (input.description !== undefined) body.description = input.description
  if (input.photo_url !== undefined) body.photo_url = input.photo_url
  const res = await fetch(`${getApiBaseUrl()}/family`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not update family (${res.status})`)
  }
  return res.json() as Promise<{ family: FamilyRow }>
}

export async function searchFamilyInviteTargets(query: string): Promise<{ matches: FamilyInviteUserMatch[] }> {
  const token = await getAccessToken()
  const q = encodeURIComponent(query.trim())
  const res = await fetch(`${getApiBaseUrl()}/family/members/search?q=${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Search failed (${res.status})`)
  }
  return res.json() as Promise<{ matches: FamilyInviteUserMatch[] }>
}

export async function inviteMemberByEmail(email: string): Promise<
  | { addedMember: true; member: FamilyMemberRow }
  | { invited: true; invitation: { id: string; email: string; expires_at: string; created_at: string } }
> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family/members`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Invite failed (${res.status})`)
  }
  return res.json() as Promise<
    | { addedMember: true; member: FamilyMemberRow }
    | { invited: true; invitation: { id: string; email: string; expires_at: string; created_at: string } }
  >
}

export async function acceptFamilyInvitation(token: string): Promise<{ ok: boolean; familyId?: string }> {
  const access = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family/invitations/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not accept invite (${res.status})`)
  }
  return res.json() as Promise<{ ok: boolean; familyId?: string; alreadyMember?: boolean }>
}
