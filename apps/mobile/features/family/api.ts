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
  display_name?: string | null
  avatar_url?: string | null
  moments_count?: number
  wines_count?: number
  countries_count?: number
}

/** Pending invitations as the admin sees them on the family dashboard.
 * `email` is filled both for legacy email-token rows and (resolved) for
 * username-invite rows; `display_name` is only present for username invites. */
export type FamilyInvitationRow = {
  id: string
  email: string | null
  invited_user_id?: string | null
  display_name?: string | null
  expires_at: string
  created_at: string
}

export type FamilyDashboard = {
  family: FamilyRow | null
  members: FamilyMemberRow[]
  pendingInvitations: FamilyInvitationRow[]
  isOwner: boolean
}

/** Pending invitation as the recipient sees it on their own family screen. */
export type IncomingInvitation = {
  id: string
  family: {
    id: string
    name: string
    description: string | null
    photo_url: string | null
  } | null
  inviter_name: string
  expires_at: string
  created_at: string
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
  const res = await fetch(`${getApiBaseUrl()}/family?op=search-members&q=${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Search failed (${res.status})`)
  }
  return res.json() as Promise<{ matches: FamilyInviteUserMatch[] }>
}

/** Email path: an App Store nudge — does NOT add the recipient to the family
 * and does NOT persist a row. If the email is already a MomentoVino account,
 * the API returns 409 with `code: 'email_already_registered'`, which we
 * surface as `{ existingUser: true; message }` so the caller can show a
 * friendly "ask for their username" dialog instead of throwing. */
export async function inviteMemberByEmail(
  email: string,
): Promise<{ emailed: true; email: string } | { existingUser: true; message: string }> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family?op=members`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    if (body.code === 'email_already_registered') {
      return {
        existingUser: true,
        message:
          body.error ??
          'This email already has a MomentoVino account. Ask them for their username and invite them through the username search.',
      }
    }
    throw new Error(body.error ?? `Invite failed (${res.status})`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Invite failed (${res.status})`)
  }
  return res.json() as Promise<{ emailed: true; email: string }>
}

/** Username path: persists a real invitation that the recipient can
 * accept/decline from inside the app. Surfaces friendly results for
 * "already invited" and "user already in another family". */
export type InviteByUsernameResult =
  | {
      invited: true
      invitation: {
        id: string
        family_id: string
        invited_user_id: string
        expires_at: string
        created_at: string
      }
    }
  | { alreadyInvited: true; message: string; expires_at?: string }
  | { targetAlreadyInFamily: true; message: string }
  | { alreadyMember: true; message: string }

export async function inviteFamilyMemberByUsername(userId: string): Promise<InviteByUsernameResult> {
  const access = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family?op=invite-by-username`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  })
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      code?: string
      invitation?: { expires_at?: string }
    }
    if (body.code === 'already_invited') {
      return {
        alreadyInvited: true,
        message: body.error ?? "You've already invited this user. Waiting for their response.",
        expires_at: body.invitation?.expires_at,
      }
    }
    if (body.code === 'target_already_in_family') {
      return {
        targetAlreadyInFamily: true,
        message: body.error ?? 'This user already belongs to another family.',
      }
    }
    if (body.code === 'already_member') {
      return {
        alreadyMember: true,
        message: body.error ?? 'This user is already a member of your family.',
      }
    }
    throw new Error(body.error ?? `Invite failed (${res.status})`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Invite failed (${res.status})`)
  }
  return res.json() as Promise<{
    invited: true
    invitation: {
      id: string
      family_id: string
      invited_user_id: string
      expires_at: string
      created_at: string
    }
  }>
}

export async function listMyInvitations(): Promise<{ invitations: IncomingInvitation[] }> {
  const access = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family?op=my-invitations`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Failed to load invitations (${res.status})`)
  }
  return res.json() as Promise<{ invitations: IncomingInvitation[] }>
}

export type AcceptInvitationResult =
  | { ok: true; familyId: string; alreadyMember?: boolean }
  | { alreadyInOtherFamily: true; message: string }

export async function acceptFamilyInvitation(invitationId: string): Promise<AcceptInvitationResult> {
  const access = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family?op=accept-invitation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: invitationId }),
  })
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    if (body.code === 'already_in_family') {
      return {
        alreadyInOtherFamily: true,
        message:
          body.error ?? "You're already in a family. Leave it first to accept a new invitation.",
      }
    }
    throw new Error(body.error ?? `Could not accept invite (${res.status})`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not accept invite (${res.status})`)
  }
  const body = (await res.json()) as { ok: true; familyId?: string; alreadyMember?: boolean }
  return {
    ok: true,
    familyId: body.familyId ?? '',
    alreadyMember: body.alreadyMember,
  }
}

export async function declineFamilyInvitation(invitationId: string): Promise<{ ok: true }> {
  const access = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}/family?op=decline-invitation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: invitationId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Could not decline invite (${res.status})`)
  }
  return { ok: true }
}

export async function removeFamilyMember(userId: string): Promise<{ ok: true }> {
  const access = await getAccessToken()
  const res = await fetch(
    `${getApiBaseUrl()}/family?op=members&user_id=${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access}` },
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `Could not remove member (${res.status})`,
    )
  }
  return { ok: true }
}
