import type { MomentFormValues } from './schema'

export type WineEntryDraft = {
  id: string
  label: string
  fromExisting: boolean
}

export type MomentDraft = {
  values: MomentFormValues
  wineEntries: WineEntryDraft[]
  selectedLocation: string | null
}

// Module-level draft for the new-moment screen. Survives unmount/remount, so
// the user can detour into the scanner / wine picker mid-edit without losing
// the form they were filling in. Cleared on intentional close or successful
// submit.
let newDraft: MomentDraft | null = null

export function readNewMomentDraft(): MomentDraft | null {
  return newDraft
}

export function saveNewMomentDraft(draft: MomentDraft): void {
  newDraft = draft
}

export function clearNewMomentDraft(): void {
  newDraft = null
}

// Edit drafts are keyed by momentId so multiple in-progress edits don't bleed
// into each other. Same lifecycle as the new-moment draft.
const editDrafts = new Map<string, MomentDraft>()

export function readEditMomentDraft(momentId: string): MomentDraft | null {
  return editDrafts.get(momentId) ?? null
}

export function saveEditMomentDraft(momentId: string, draft: MomentDraft): void {
  editDrafts.set(momentId, draft)
}

export function clearEditMomentDraft(momentId: string): void {
  editDrafts.delete(momentId)
}
