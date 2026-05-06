import type { MomentFormValues } from '../moments/schema'
import type { ScanResult } from '../scanner/types'
import type { PendingLabelPhoto } from '../scanner/pending-label-photo'

export type CapturedWine = ScanResult & {
  labelPhoto: PendingLabelPhoto | null
}

export type CapturedMoment = Omit<MomentFormValues, 'wineId'>

type CaptureState = {
  wine: CapturedWine | null
  moment: CapturedMoment | null
}

let state: CaptureState = { wine: null, moment: null }

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
