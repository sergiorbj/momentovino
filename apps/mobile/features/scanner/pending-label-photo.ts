export type PendingLabelPhoto = { uri: string; mimeType: string }

let pending: PendingLabelPhoto | null = null
/** Survives React StrictMode remount so the result screen can still read the photo. */
let lastTaken: PendingLabelPhoto | null = null

export function setPendingLabelPhoto(p: PendingLabelPhoto) {
  lastTaken = null
  pending = p
}

/**
 * First call after a successful scan consumes `pending` into `lastTaken`.
 * Later calls (e.g. StrictMode remount) return the same snapshot.
 */
export function takeLabelPhotoForResult(): PendingLabelPhoto | null {
  if (pending) {
    lastTaken = pending
    pending = null
    return lastTaken
  }
  return lastTaken
}
