import { supabase } from '../../lib/supabase'

const BUCKET = 'avatars'

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?|$)/)
  const ext = match?.[1]?.toLowerCase()
  if (!ext) return 'jpg'
  if (['heic', 'heif'].includes(ext)) return 'jpg'
  return ext
}

function contentTypeFor(ext: string): string {
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = extensionFromUri(uri)
  const path = `${userId}/avatar.${ext}`
  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()
  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: contentTypeFor(ext),
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
