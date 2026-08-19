import { ZodError } from "zod"

import { ApiError, type ApiErrorDetail } from "./ApiError"

/*
 * Converts a ZodError into the same ApiError shape everything else in
 * the error pipeline already speaks — so validation failures flow
 * through the exact same sendError() call as any other operational
 * error, just with `errors` populated.
 */
export function zodErrorToApiError(err: ZodError): ApiError {
  const errors: ApiErrorDetail[] = err.issues.map((issue) => ({
    field  : issue.path.length ? issue.path.join(".") : undefined,
    message: issue.message,
  }))

  // Name the offending fields in the top-level message itself, so a
  // client that only surfaces `message` (a toast, a log line) still
  // tells the user something actionable instead of just "failed".
  const fields = [...new Set(errors.map((e) => e.field).filter(Boolean))] as string[]
  const message = fields.length
    ? `Validation failed for: ${fields.join(", ")}.`
    : "Validation failed."

  return new ApiError(400, message, "VALIDATION_ERROR", errors)
}