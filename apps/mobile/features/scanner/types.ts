export interface ScanResult {
  name: string
  producer: string | null
  vintage: number | null
  region: string | null
  country: string | null
  type: string | null
  description: string
}

export interface ScanErrorResult {
  error: string
}

export type ScanResponse = ScanResult | ScanErrorResult

export function isScanError(res: ScanResponse): res is ScanErrorResult {
  return 'error' in res
}
