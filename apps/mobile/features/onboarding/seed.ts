import { Image } from 'react-native'

import { createMoment, createWine } from '../moments/api'
import { STARTER_DECK, getStarterWine, type StarterWine } from './starter-deck'

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']

function titleFor(index: number): string {
  const word = ORDINALS[index] ?? `${index + 1}th`
  return `My ${word} wine moment`
}

function resolveAssetUri(asset: number): string {
  const resolved = Image.resolveAssetSource(asset)
  if (!resolved?.uri) throw new Error('Failed to resolve starter wine image')
  return resolved.uri
}

export type SeededMoment = {
  wineId: string
  momentId: string
  starter: StarterWine
}

/**
 * Creates one `wines` row and one `moments` row per picked starter, in order.
 * Each moment's photo is the bundled label image from the starter deck, so the
 * schema's `photos.min(1)` invariant is satisfied without any special-case.
 */
export async function seedStarterJournal(pickedKeys: string[]): Promise<SeededMoment[]> {
  const starters = pickedKeys
    .map((k) => getStarterWine(k))
    .filter((s): s is StarterWine => s != null)

  const happenedAt = new Date().toISOString()
  const out: SeededMoment[] = []

  for (let i = 0; i < starters.length; i++) {
    const starter = starters[i]
    const wineRow = await createWine(starter.wine)
    const momentRow = await createMoment({
      title: titleFor(i),
      happenedAt,
      locationName: starter.locationName,
      latitude: starter.latitude,
      longitude: starter.longitude,
      wineId: wineRow.id,
      photos: [{ uri: resolveAssetUri(starter.image), isCover: true }],
    })
    out.push({ wineId: wineRow.id, momentId: momentRow.id, starter })
  }

  return out
}

export { STARTER_DECK }
