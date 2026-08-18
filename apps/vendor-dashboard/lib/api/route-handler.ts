import { NextResponse } from "next/server"
import { BackendApiError } from "./server"

/*
 * Shared shape for every app/api/onboarding/** Route Handler — each one
 * is just backendFetch(...) wrapped in this so the client always gets
 * a consistent envelope and status code, whether the backend responded
 * with a structured error or something failed before we even reached it.
 */
export async function proxyBackendCall<T>(fn: () => Promise<T>) {
  try {
    const data = await fn()
    return NextResponse.json({ status: "success", data })
  } catch (err) {
    if (err instanceof BackendApiError) {
      return NextResponse.json(
        { status: "error", message: err.message, code: err.code, errors: err.errors },
        { status: err.status },
      )
    }
    return NextResponse.json(
      { status: "error", message: "Unexpected error", code: "UNKNOWN_ERROR" },
      { status: 500 },
    )
  }
}
