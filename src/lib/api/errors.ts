export const ERROR_STATUS = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

export class AppError extends Error {
  readonly fields?: Record<string, string>

  constructor(
    readonly code: ErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "AppError"
    this.fields = fields
  }

  get status() {
    return ERROR_STATUS[this.code]
  }
}
