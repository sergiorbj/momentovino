import { getApiBaseUrl } from '../../lib/api-base'
import { supabase } from '../../lib/supabase'
import type { ScanResponse } from './types'

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No active session')
  return token
}

export async function scanWineImage(
  base64: string,
  mimeType: string
): Promise<ScanResponse> {
  const token = await getAccessToken()

  const res = await fetch(`${getApiBaseUrl()}/scan-wine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64, mimeType }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Scan failed (${res.status})`)
  }

  return res.json()
}

interface CreateWineInput {
  name: string
  producer?: string | null
  vintage?: number | null
  region?: string | null
  country?: string | null
  type?: string | null
}

export interface WineResponse {
  id: string
  name: string
  producer: string | null
  vintage: number | null
  region: string | null
  country: string | null
  type: string | null
  label_photo_url: string | null
  created_by: string
  created_at: string
}

export async function createWineViaApi(input: CreateWineInput): Promise<WineResponse> {
  const token = await getAccessToken()

  const res = await fetch(`${getApiBaseUrl()}/wines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Failed to create wine (${res.status})`)
  }

  return res.json()
}

const WINE_LABELS_BUCKET = 'wine-labels'

function extFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase()
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  return 'jpg'
}

/**
 * Uploads the scanned label using the user session (storage RLS), then sets `wines.label_photo_url`.
 */
export async function attachWineLabelPhoto(wineId: string, localUri: string, mimeType: string): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    throw userErr ?? new Error('Not authenticated')
  }
  const userId = userData.user.id
  const ext = extFromMime(mimeType)
  const path = `${userId}/${wineId}.${ext}`

  const fileRes = await fetch(localUri)
  if (!fileRes.ok) {
    throw new Error(`Could not read label image (${fileRes.status})`)
  }
  const arrayBuffer = await fileRes.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from(WINE_LABELS_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mimeType || 'image/jpeg',
      upsert: true,
    })
  if (uploadErr) {
    throw new Error(uploadErr.message)
  }

  const { data: pub } = supabase.storage.from(WINE_LABELS_BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: updateErr } = await supabase
    .from('wines')
    .update({ label_photo_url: publicUrl })
    .eq('id', wineId)
    .eq('created_by', userId)

  if (updateErr) {
    throw new Error(updateErr.message)
  }

  return publicUrl
}
