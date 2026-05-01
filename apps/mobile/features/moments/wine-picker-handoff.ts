export type PendingWinePick = { wineId: string; wineName: string }

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
