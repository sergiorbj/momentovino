import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { MomentFormValues, WineInput } from './schema'

type WineRow = Database['public']['Tables']['wines']['Row']
type MomentRow = Database['public']['Tables']['moments']['Row']
type MomentPhotoRow = Database['public']['Tables']['moment_photos']['Row']

export type MomentWithWine = MomentRow & { wine_name: string | null }

export interface MomentDetail {
  moment: MomentRow
  wine: WineRow | null
  photos: MomentPhotoRow[]
}

const BUCKET = 'moment-photos'

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

export async function searchWines(query: string): Promise<WineRow[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return []

  const userId = userData.user.id
  const trimmed = query.trim()
  const builder = supabase
    .from('wines')
    .select('*')
    .eq('created_by', userId)
    .order('name', { ascending: true })
    .limit(50)

  const { data, error } =
    trimmed.length > 0 ? await builder.ilike('name', `%${trimmed}%`) : await builder
  if (error) throw error
  return data ?? []
}

export async function createWine(input: WineInput): Promise<WineRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')

  const { data, error } = await supabase
    .from('wines')
    .insert({
      created_by: userData.user.id,
      name: input.name,
      producer: input.producer ?? null,
      vintage: input.vintage ?? null,
      region: input.region ?? null,
      country: input.country ?? null,
      type: input.type ?? null,
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('Failed to create wine')
  return data
}

async function uploadPhoto(
  userId: string,
  momentId: string,
  position: number,
  uri: string
): Promise<string> {
  const ext = extensionFromUri(uri)
  const path = `${userId}/${momentId}/${position}.${ext}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: contentTypeFor(ext),
      upsert: true,
    })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function createMoment(values: MomentFormValues): Promise<MomentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  const { data: moment, error: insertErr } = await supabase
    .from('moments')
    .insert({
      user_id: userId,
      wine_id: values.wineId,
      title: values.title,
      description: values.description ?? null,
      happened_at: values.happenedAt,
      location_name: values.locationName,
      latitude: values.latitude,
      longitude: values.longitude,
      rating: values.rating ?? null,
    })
    .select()
    .single()
  if (insertErr || !moment) throw insertErr ?? new Error('Failed to create moment')

  let coverUrl: string | null = null
  for (let i = 0; i < values.photos.length; i++) {
    const photo = values.photos[i]
    const url = await uploadPhoto(userId, moment.id, i, photo.uri)
    if (photo.isCover) coverUrl = url

    const { error: photoErr } = await supabase.from('moment_photos').insert({
      moment_id: moment.id,
      url,
      position: i,
      is_cover: photo.isCover,
    })
    if (photoErr) throw photoErr
  }

  if (coverUrl) {
    const { data: updated, error: updateErr } = await supabase
      .from('moments')
      .update({ cover_photo_url: coverUrl })
      .eq('id', moment.id)
      .select()
      .single()
    if (updateErr || !updated) throw updateErr ?? new Error('Failed to set cover photo')
    return updated
  }

  return moment
}

export async function fetchMoments(): Promise<MomentWithWine[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*, wines(name)')
    .order('happened_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    ...row,
    wine_name: row.wines?.name ?? null,
    wines: undefined,
  }))
}

export async function fetchMomentDetail(id: string): Promise<MomentDetail> {
  const { data: moment, error: momentErr } = await supabase
    .from('moments')
    .select('*')
    .eq('id', id)
    .single()
  if (momentErr || !moment) throw momentErr ?? new Error('Moment not found')

  let wine: WineRow | null = null
  if (moment.wine_id) {
    const { data } = await supabase
      .from('wines')
      .select('*')
      .eq('id', moment.wine_id)
      .single()
    wine = data ?? null
  }

  const { data: photos, error: photosErr } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('moment_id', id)
    .order('position', { ascending: true })
  if (photosErr) throw photosErr

  return { moment, wine, photos: photos ?? [] }
}
