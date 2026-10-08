export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function toApiError(body: unknown, status: number, fallback: string): ApiError {
  const { error, code } = (body ?? {}) as { error?: unknown; code?: unknown }
  return new ApiError(
    typeof error === 'string' ? error : `${fallback} (${status})`,
    status,
    typeof code === 'string' ? code : null,
  )
}
