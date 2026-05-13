export type PendingWinePick = {
  wineId: string
  wineName: string
  /**
   * True when the wine already existed in the user's cellar and was selected via the
   * wine picker (so `createMoment`/`updateMoment` should clone the row → `×N` and
   * total count both increase). False/undefined when the wine was just created by
   * the scanner.
   */
  isExistingWine?: boolean
}

// Module-level append-only queue. Multi-wine moments let the user open the
// picker/scanner several times in a row and accumulate wine selections on the
// current draft; the screen drains the queue on focus and appends each pick.
let pending: PendingWinePick[] = []

/** Queue a pick before `router.back()` from the picker / scanner-result screen. */
export function setPendingWinePick(p: PendingWinePick): void {
  pending.push(p)
}

/**
 * Drain all queued picks (typical use: form screens consume these inside
 * `useFocusEffect` and append them to the wine list).
 */
export function takePendingWinePicks(): PendingWinePick[] {
  const v = pending
  pending = []
  return v
}

/**
 * Backwards-compatible single-shot drain. Returns the most recently queued pick
 * (and clears the entire queue). Prefer `takePendingWinePicks()` for new code.
 */
export function takePendingWinePick(): PendingWinePick | null {
  if (pending.length === 0) return null
  const last = pending[pending.length - 1]
  pending = []
  return last
}
