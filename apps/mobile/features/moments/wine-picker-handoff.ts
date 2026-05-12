export type PendingWinePick = {
  wineId: string
  wineName: string
  /**
   * True when the wine already existed in the user's cellar and was selected via the
   * wine picker (so `createMoment` should clone the row → `×N` and total count both
   * increase). False/undefined when the wine was just created by the scanner.
   */
  isExistingWine?: boolean
}

let pending: PendingWinePick | null = null

/** Call before `router.back()` from the wine picker so `NewMomentScreen` can apply the selection. */
export function setPendingWinePick(p: PendingWinePick): void {
  pending = p
}

/** Consume a wine picked on the previous navigation (one shot). */
export function takePendingWinePick(): PendingWinePick | null {
  const v = pending
  pending = null
  return v
}
