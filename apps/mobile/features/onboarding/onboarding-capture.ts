import type { MomentFormValues } from '../moments/schema'
import type { ScanResult } from '../scanner/types'
import type { PendingLabelPhoto } from '../scanner/pending-label-photo'

/** Onboarding always captures exactly one bottle; multi-wine moments are post-onboarding only. */
export const ONBOARDING_MAX_WINES = 1 as const

export type CapturedWine = ScanResult & {
  labelPhoto: PendingLabelPhoto | null
}

export type CapturedMoment = Omit<MomentFormValues, 'wineIds'>

type CaptureState = {
  wine: CapturedWine | null
  moment: CapturedMoment | null
}

let state: CaptureState = { wine: null, moment: null }

/** Stores the wine identified during onboarding (always a single bottle). */
export function setCapturedWine(wine: CapturedWine): void {
  state.wine = wine
}

export function setCapturedMoment(moment: CapturedMoment): void {
  state.moment = moment
}

export function getCapture(): CaptureState {
  return { wine: state.wine, moment: state.moment }
}

export function resetCapture(): void {
  state = { wine: null, moment: null }
}
