import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { MomentPin } from '../../components/globe/types'
import type { MomentFormValues, WineInput } from './schema'

type WineRow = Database['public']['Tables']['wines']['Row']
type MomentRow = Database['public']['Tables']['moments']['Row']
type MomentPhotoRow = Database['public']['Tables']['moment_photos']['Row']

/**
 * A moment as shown in lists: includes the ordered set of wines tasted
 * (ordered by the junction's `position`). Multi-wine UIs surface the first
 * wine plus a "+N" chip; single-wine moments behave identically to before.
 */
export type MomentWithWines = MomentRow & {
  wines: { id: string; name: string }[]
}

export interface MomentDetail {
  moment: MomentRow
  wines: WineRow[]
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

/** Deletes wine rows owned by the current user. The `moment_wines` FK cascades. */
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
   * Subset of `values.wineIds` that came from the cellar via the picker and
   * therefore need cloning before linking (so the cellar `×N` and total wine
   * count both go up — same semantics as re-scanning). Wines added by the
   * scanner are already fresh rows, so they shouldn't be listed here.
   */
  cloneFromExistingWineIds?: string[]
}

async function resolveWineIdsForLinking(
  wineIds: string[],
  cloneFromExistingWineIds: string[] | undefined,
): Promise<string[]> {
  // Maintains the form-ordered list of wineIds, but swaps in clones for any
  // wineId flagged as "fromExisting". Each clone keeps clone-on-pick semantics
  // (per-bottle row in the cellar).
  if (!cloneFromExistingWineIds || cloneFromExistingWineIds.length === 0) {
    return wineIds.slice()
  }
  const toClone = new Set(cloneFromExistingWineIds)
  const out: string[] = []
  for (const id of wineIds) {
    if (toClone.has(id)) {
      const clone = await cloneWineForReuse(id)
      out.push(clone.id)
    } else {
      out.push(id)
    }
  }
  return out
}

async function insertMomentWines(momentId: string, wineIds: string[]): Promise<void> {
  if (wineIds.length === 0) return
  const rows = wineIds.map((wine_id, position) => ({
    moment_id: momentId,
    wine_id,
    position,
  }))
  const { error } = await supabase.from('moment_wines').insert(rows)
  if (error) {
    throw new Error(`[moment_wines.insert] ${error.message}`)
  }
}

export async function createMoment(
  values: MomentFormValues,
  options?: CreateMomentOptions,
): Promise<MomentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  const linkedWineIds = await resolveWineIdsForLinking(
    values.wineIds,
    options?.cloneFromExistingWineIds,
  )

  const { data: moment, error: insertErr } = await supabase
    .from('moments')
    .insert({
      user_id: userId,
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
    throw new Error(`[moments.insert] ${detail} (uid=${userId.slice(0, 8)} wines=${linkedWineIds.length})`)
  }

  await insertMomentWines(moment.id, linkedWineIds)

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
   * Mirrors `CreateMomentOptions.cloneFromExistingWineIds`: wineIds in the new
   * list that came from the picker (already in the cellar) and therefore need
   * cloning before being linked to the moment.
   */
  cloneFromExistingWineIds?: string[]
}

export async function updateMoment(
  id: string,
  values: MomentFormValues,
  options?: UpdateMomentOptions,
): Promise<MomentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  // Snapshot the previous wine link set so we can diff and clean up orphans.
  const { data: existingLinks, error: existingLinksErr } = await supabase
    .from('moment_wines')
    .select('wine_id')
    .eq('moment_id', id)
  if (existingLinksErr) {
    throw new Error(`[moment_wines.fetch] ${existingLinksErr.message}`)
  }
  const previousWineIds = (existingLinks ?? []).map((r) => r.wine_id)

  // Validate that the parent moment exists and is owned by us before we mutate
  // anything (cheap UX guard; RLS would block writes anyway).
  const { data: existingMoment, error: existingMomentErr } = await supabase
    .from('moments')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (existingMomentErr || !existingMoment) {
    const detail = existingMomentErr?.message ?? 'moment not found'
    throw new Error(`[moments.fetch] ${detail}`)
  }

  // Clone any newly-picked existing wines before we rebuild the junction. We
  // only clone wines that are present in `cloneFromExistingWineIds` AND were
  // not already linked (re-saving an unchanged wine shouldn't bump `×N`).
  const previousSet = new Set(previousWineIds)
  const cloneRequest = (options?.cloneFromExistingWineIds ?? []).filter(
    (wid) => !previousSet.has(wid),
  )
  const linkedWineIds = await resolveWineIdsForLinking(values.wineIds, cloneRequest)

  // Replace the junction: drop all current rows then insert the new ordered
  // set. Doing this in two statements is fine because RLS scopes the deletes
  // to this moment and the insert is atomic from the client's POV.
  const { error: clearErr } = await supabase
    .from('moment_wines')
    .delete()
    .eq('moment_id', id)
  if (clearErr) {
    throw new Error(`[moment_wines.clear] ${clearErr.message}`)
  }
  await insertMomentWines(id, linkedWineIds)

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

  // Orphan cleanup: any wineId that used to be linked but isn't anymore should
  // be removed from the cellar IFF no other moment references it. Under the
  // clone-on-pick policy that's typically every removed wine.
  const newSet = new Set(linkedWineIds)
  const removedWineIds = previousWineIds.filter((wid) => !newSet.has(wid))
  for (const wineId of removedWineIds) {
    const { count, error: countErr } = await supabase
      .from('moment_wines')
      .select('moment_id', { count: 'exact', head: true })
      .eq('wine_id', wineId)
    if (!countErr && (count ?? 0) === 0) {
      await supabase.from('wines').delete().eq('id', wineId).eq('created_by', userId)
    }
  }

  return updated
}

export async function deleteMoment(id: string): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr ?? new Error('No authenticated user')
  const userId = userData.user.id

  // Capture the wines linked to this moment first so we can decrement the
  // cellar (clone-on-pick reserves a bottle per moment — when the moment
  // disappears, those bottles should disappear too if nothing else holds them).
  const { data: links } = await supabase
    .from('moment_wines')
    .select('wine_id')
    .eq('moment_id', id)
  const linkedWineIds = (links ?? []).map((r) => r.wine_id)

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

  // FK on `moment_wines` cascades to clean up the junction rows. After cascade
  // each previously-linked wine row may now be orphaned — delete it if so.
  for (const wineId of linkedWineIds) {
    const { count, error: countErr } = await supabase
      .from('moment_wines')
      .select('moment_id', { count: 'exact', head: true })
      .eq('wine_id', wineId)
    if (!countErr && (count ?? 0) === 0) {
      await supabase.from('wines').delete().eq('id', wineId).eq('created_by', userId)
    }
  }
}

type MomentListJoinRow = MomentRow & {
  moment_wines: { position: number; wines: { id: string; name: string } | null }[] | null
}

export async function fetchMoments(): Promise<MomentWithWines[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*, moment_wines(position, wines(id, name))')
    .order('happened_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as MomentListJoinRow[]).map((row) => {
    const links = row.moment_wines ?? []
    const wines = links
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => l.wines)
      .filter((w): w is { id: string; name: string } => w != null)
    const { moment_wines: _ignored, ...rest } = row
    return { ...rest, wines }
  })
}

type MomentStatsJoinRow = {
  id: string
  latitude: number
  longitude: number
  location_name: string
  moment_wines: { wines: { country: string | null } | null }[] | null
}

/**
 * Aggregates everything the Moments tab needs in a single round-trip:
 * pin coordinates for the globe + totals for the stats row. Countries are
 * unioned across every wine tasted at every moment.
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
    .select('id, latitude, longitude, location_name, moment_wines(wines(country))')
    .eq('user_id', userId)
  if (momentsErr) throw momentsErr

  const rows = (moments ?? []) as MomentStatsJoinRow[]
  const pins: MomentPin[] = []
  const countries = new Set<string>()
  for (const row of rows) {
    pins.push({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      label: row.location_name,
    })
    for (const link of row.moment_wines ?? []) {
      const country = link.wines?.country
      if (country) countries.add(country)
    }
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

type MomentDetailJoinRow = MomentRow & {
  moment_wines: { position: number; wines: WineRow | null }[] | null
}

export async function fetchMomentDetail(id: string): Promise<MomentDetail> {
  const { data: row, error: momentErr } = await supabase
    .from('moments')
    .select('*, moment_wines(position, wines(*))')
    .eq('id', id)
    .single<MomentDetailJoinRow>()
  if (momentErr || !row) throw momentErr ?? new Error('Moment not found')

  const { moment_wines: links, ...moment } = row
  const wines = (links ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((l) => l.wines)
    .filter((w): w is WineRow => w != null)

  const { data: photos, error: photosErr } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('moment_id', id)
    .order('position', { ascending: true })
  if (photosErr) throw photosErr

  return { moment, wines, photos: photos ?? [] }
}
