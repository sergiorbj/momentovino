export interface ScanResult {
  name: string
  producer: string
  region: string
  country: string
  type: string
  description: string
}

export interface ScanErrorResult {
  error: string
}

export type ScanResponse = ScanResult | ScanErrorResult

export function isScanError(res: ScanResponse): res is ScanErrorResult {
  return 'error' in res
}
