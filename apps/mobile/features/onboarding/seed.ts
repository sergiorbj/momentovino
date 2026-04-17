import { createMoment, createWine } from '../moments/api'
import { STARTER_DECK, getStarterWine, type StarterWine } from './starter-deck'

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']

function titleFor(index: number): string {
  const word = ORDINALS[index] ?? `${index + 1}th`
  return `My ${word} wine moment`
}

export type SeededMoment = {
  wineId: string
  momentId: string
  starter: StarterWine
}

/**
 * Creates one `wines` row and one `moments` row per picked starter, in order.
 * Seeded moments intentionally ship without a cover photo — the label PNGs are
 * bundled assets, not the user's own photos, and uploading them to storage
 * currently fails RLS for anonymous sessions. The UI shows a wine-icon
 * placeholder until the user adds their own photo from the moment detail.
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
      photos: [],
    })
    out.push({ wineId: wineRow.id, momentId: momentRow.id, starter })
  }

  return out
}

export { STARTER_DECK }
