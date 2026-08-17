export { errorHandler } from "./error.middleware"

// Re-exported from their real home in @/errors so existing imports of
// `ApiError` from "@/middleware/error" keep working unchanged — the
// middleware uses ApiError, it doesn't own it anymore.
export { ApiError } from "@/errors/ApiError"
export type { ApiErrorDetail } from "@/errors/ApiError"
export { zodErrorToApiError } from "@/errors/ZodError"