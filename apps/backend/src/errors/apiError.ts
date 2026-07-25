/**
 * Field-level validation detail — populated when an ApiError is built
 * from a ZodError. Shared with helpers/api-response/response.ts so
 * both sides of the response envelope agree on the shape.
 */
export interface ApiErrorDetail {
  field?: string
  message: string
}

/**
 * Application error with HTTP status code and optional machine-readable code.
 * Throw this anywhere in route handlers or services:
 *
 *   throw new ApiError(404, "Vendor not found", "VENDOR_NOT_FOUND")
 *
 * isOperational defaults to true because almost every ApiError you
 * throw by hand IS an expected, known failure — bad input, a record
 * that doesn't exist, a business rule violation — not a bug. The
 * only place that constructs one with isOperational: false is the
 * error middleware itself, for a failure it couldn't otherwise
 * classify at all.
 */
export class ApiError extends Error {
  statusCode   : number
  code         : string
  errors?      : ApiErrorDetail[]
  isOperational: boolean

  constructor(
    statusCode: number,
    message: string,
    code = "API_ERROR",
    errors?: ApiErrorDetail[],
    isOperational = true,
  ) {
    super(message)
    this.statusCode    = statusCode
    this.code          = code
    this.errors        = errors
    this.isOperational = isOperational
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}