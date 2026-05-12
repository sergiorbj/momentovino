import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { MomentPin } from '../../components/globe/types'
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

export interface MomentStats {
  momentsCount: number
  countriesCount: number
  winesCount: number
  pins: MomentPin[]
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
    .order('created_at', { ascending: false })
    .limit(120)

  const { data, error } =
    trimmed.length > 0 ? await builder.ilike('name', `%${trimmed}%`) : await builder
  if (error) throw error
  return data ?? []
}

/** Total wine rows for the current user (for collection stats). */
export async function countUserWines(): Promise<number> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return 0

  const { count, error } = await supabase
    .from('wines')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userData.user.id)

  if (error) throw error
  return count ?? 0
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

/**
 * Clones an existing wine row for the current user. Used when the user logs a new
 * moment with a wine already in their cellar: by inserting another wine row with
 * the same identifying fields, the cluster (`×N`) badge and the total wines count
 * both go up — mirroring what would happen if they had re-scanned the same bottle.
 * The label photo is preserved so the cluster avatar stays consistent.
 */
export async function cloneWineForReuse(sourceWineId: string): Promise<WineRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  const { data: source, error: fetchErr } = await supabase
    .from('wines')
    .select('name, producer, vintage, region, country, type, label_photo_url')
    .eq('id', sourceWineId)
    .eq('created_by', userId)
    .single()
  if (fetchErr || !source) {
    const detail = fetchErr?.message ?? 'source wine not found'
    throw new Error(`[wines.clone.fetch] ${detail}`)
  }

  const { data: clone, error: insertErr } = await supabase
    .from('wines')
    .insert({
      created_by: userId,
      name: source.name,
      producer: source.producer,
      vintage: source.vintage,
      region: source.region,
      country: source.country,
      type: source.type,
      label_photo_url: source.label_photo_url,
    })
    .select()
    .single()
  if (insertErr || !clone) {
    const detail = insertErr?.message ?? 'unknown'
    throw new Error(`[wines.clone.insert] ${detail}`)
  }
  return clone
}

/** Deletes wine rows owned by the current user. Moments keep `wine_id` null via FK. */
export async function deleteWinesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')

  const { data, error } = await supabase.from('wines').delete().in('id', ids).select('id')
  if (error) throw error
  const removed = data?.length ?? 0
  if (removed !== ids.length) {
    throw new Error(
      'Could not remove wine(s). If this persists, apply the Supabase migration 0008_wines_delete_own.sql (wines delete policy).',
    )
  }
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
      // Paths are `${userId}/${newMomentId}/${i}.ext` — unique per save; avoid upsert so we only need INSERT RLS (upsert also requires UPDATE policies).
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export interface CreateMomentOptions {
  /**
   * When the wine was selected via the picker (i.e. it already exists in the user's
   * cellar), clone the wine row first so that logging another moment for it bumps
   * both the per-wine `×N` badge and the total wine count — same as re-scanning.
   * Leave false/undefined when the wine was just created by the scanner.
   */
  cloneWineFromExisting?: boolean
}

export async function createMoment(
  values: MomentFormValues,
  options?: CreateMomentOptions,
): Promise<MomentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  let wineIdForMoment = values.wineId
  if (options?.cloneWineFromExisting && values.wineId) {
    const clone = await cloneWineForReuse(values.wineId)
    wineIdForMoment = clone.id
  }

  const { data: moment, error: insertErr } = await supabase
    .from('moments')
    .insert({
      user_id: userId,
      wine_id: wineIdForMoment,
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
  if (insertErr || !moment) {
    const detail = insertErr?.message ?? 'unknown'
    throw new Error(`[moments.insert] ${detail} (uid=${userId.slice(0, 8)} wine=${wineIdForMoment.slice(0, 8)})`)
  }

  let coverUrl: string | null = null
  for (let i = 0; i < values.photos.length; i++) {
    const photo = values.photos[i]
    let url: string
    try {
      url = await uploadPhoto(userId, moment.id, i, photo.uri)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown'
      throw new Error(`[storage.upload #${i}] ${detail}`)
    }
    if (photo.isCover) coverUrl = url

    const { error: photoErr } = await supabase.from('moment_photos').insert({
      moment_id: moment.id,
      url,
      position: i,
      is_cover: photo.isCover,
    })
    if (photoErr) {
      throw new Error(`[moment_photos.insert #${i}] ${photoErr.message}`)
    }
  }

  if (coverUrl) {
    const { data: updated, error: updateErr } = await supabase
      .from('moments')
      .update({ cover_photo_url: coverUrl })
      .eq('id', moment.id)
      .select()
      .single()
    if (updateErr || !updated) {
      const detail = updateErr?.message ?? 'unknown'
      throw new Error(`[moments.update cover] ${detail}`)
    }
    return updated
  }

  return moment
}

export interface UpdateMomentOptions {
  /**
   * Mirrors `CreateMomentOptions.cloneWineFromExisting`: when the user swaps the
   * moment's wine to one that already exists in the cellar (picker selection), we
   * clone that row so the cellar `×N` reflects an additional bottle. Scanner swaps
   * leave this false because the scanner already inserted a fresh wine row.
   */
  cloneWineFromExisting?: boolean
}

export async function updateMoment(
  id: string,
  values: MomentFormValues,
  options?: UpdateMomentOptions,
): Promise<MomentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  // Snapshot the previous wine_id so we can adjust the cellar count if the user
  // swaps wines. We re-query here instead of trusting form state because the
  // form's wineId is the *new* selection.
  const { data: existingMoment, error: existingMomentErr } = await supabase
    .from('moments')
    .select('wine_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (existingMomentErr || !existingMoment) {
    const detail = existingMomentErr?.message ?? 'moment not found'
    throw new Error(`[moments.fetch] ${detail}`)
  }
  const previousWineId = existingMoment.wine_id

  // If swapping to another existing wine, clone it so the cellar `×N` grows
  // (matches the create-moment behaviour and what `cloneWineForReuse` documents).
  let finalWineId = values.wineId
  const wineChanged = previousWineId !== values.wineId
  if (wineChanged && options?.cloneWineFromExisting && values.wineId) {
    const clone = await cloneWineForReuse(values.wineId)
    finalWineId = clone.id
  }

  const { data: existingPhotos, error: existingErr } = await supabase
    .from('moment_photos')
    .select('id, url, position, is_cover')
    .eq('moment_id', id)
    .order('position', { ascending: true })
  if (existingErr) throw existingErr

  const existing = existingPhotos ?? []
  const keptUrls = new Set(values.photos.filter((p) => !p.uri.startsWith('file:') && !p.uri.startsWith('content:')).map((p) => p.uri))
  const toDelete = existing.filter((row) => !keptUrls.has(row.url))

  if (toDelete.length > 0) {
    const ids = toDelete.map((row) => row.id)
    const { error: delErr } = await supabase.from('moment_photos').delete().in('id', ids)
    if (delErr) throw new Error(`[moment_photos.delete] ${delErr.message}`)
  }

  // Reindex retained photos to keep positions contiguous and re-anchor cover.
  let coverUrl: string | null = null
  for (let i = 0; i < values.photos.length; i++) {
    const photo = values.photos[i]
    const isExisting = !photo.uri.startsWith('file:') && !photo.uri.startsWith('content:')

    if (isExisting) {
      const row = existing.find((r) => r.url === photo.uri)
      if (row) {
        const { error: updErr } = await supabase
          .from('moment_photos')
          .update({ position: i, is_cover: photo.isCover })
          .eq('id', row.id)
        if (updErr) throw new Error(`[moment_photos.update #${i}] ${updErr.message}`)
      }
      if (photo.isCover) coverUrl = photo.uri
      continue
    }

    let url: string
    try {
      url = await uploadPhoto(userId, id, i, photo.uri)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown'
      throw new Error(`[storage.upload #${i}] ${detail}`)
    }
    if (photo.isCover) coverUrl = url

    const { error: insertErr } = await supabase.from('moment_photos').insert({
      moment_id: id,
      url,
      position: i,
      is_cover: photo.isCover,
    })
    if (insertErr) throw new Error(`[moment_photos.insert #${i}] ${insertErr.message}`)
  }

  const { data: updated, error: updErr } = await supabase
    .from('moments')
    .update({
      wine_id: finalWineId,
      title: values.title,
      description: values.description ?? null,
      happened_at: values.happenedAt,
      location_name: values.locationName,
      latitude: values.latitude,
      longitude: values.longitude,
      rating: values.rating ?? null,
      cover_photo_url: coverUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (updErr || !updated) {
    const detail = updErr?.message ?? 'unknown'
    throw new Error(`[moments.update] ${detail}`)
  }

  // Decrement the cellar count for the previous wine: delete the row IFF no other
  // moment of this user still references it. The FK is ON DELETE SET NULL
  // (migration 0001), so an unchecked delete would silently null out a legitimate
  // moment from before the clone-on-pick feature shipped.
  if (wineChanged && previousWineId) {
    const { count, error: countErr } = await supabase
      .from('moments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('wine_id', previousWineId)
    if (!countErr && (count ?? 0) === 0) {
      await supabase.from('wines').delete().eq('id', previousWineId).eq('created_by', userId)
    }
  }

  return updated
}

export async function deleteMoment(id: string): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  const folder = `${userId}/${id}`
  const { data: storageFiles } = await supabase.storage.from(BUCKET).list(folder)
  if (storageFiles && storageFiles.length > 0) {
    const paths = storageFiles.map((f) => `${folder}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  }

  const { error: deleteErr } = await supabase
    .from('moments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (deleteErr) throw new Error(`[moments.delete] ${deleteErr.message}`)
}

export async function fetchMoments(): Promise<MomentWithWine[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*, wines(name)')
    .order('happened_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    ...row,
    wine_name: row.wines?.name ?? null,
    wines: undefined,
  }))
}

/**
 * Aggregates everything the Moments tab needs in a single round-trip:
 * pin coordinates for the globe + totals for the stats row. Countries are
 * derived from the associated wine's `country` field.
 */
export async function fetchMomentStats(): Promise<MomentStats> {
  const empty: MomentStats = {
    momentsCount: 0,
    countriesCount: 0,
    winesCount: 0,
    pins: [],
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return empty
  const userId = userData.user.id

  const { data: moments, error: momentsErr } = await supabase
    .from('moments')
    .select('id, latitude, longitude, location_name, wines(country)')
    .eq('user_id', userId)
  if (momentsErr) throw momentsErr

  const rows = moments ?? []
  const pins: MomentPin[] = []
  const countries = new Set<string>()
  for (const row of rows) {
    pins.push({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      label: row.location_name,
    })
    const joined = (row as { wines?: { country: string | null } | null }).wines
    if (joined?.country) countries.add(joined.country)
  }

  const { count: winesCount, error: winesErr } = await supabase
    .from('wines')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
  if (winesErr) throw winesErr

  return {
    momentsCount: rows.length,
    countriesCount: countries.size,
    winesCount: winesCount ?? 0,
    pins,
  }
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
