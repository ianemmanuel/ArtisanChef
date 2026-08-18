/*
 * Client-side fetch wrapper — always calls our own /api/onboarding/**
 * Route Handlers, never the backend directly. The Clerk token is
 * attached server-side inside those routes (see lib/api/server.ts), so
 * it never needs to exist in client JS at all.
 */
export class ClientApiError extends Error {
  code: string
  errors?: { field?: string; message: string }[]

  constructor(message: string, code: string, errors?: { field?: string; message: string }[]) {
    super(message)
    this.name = "ClientApiError"
    this.code = code
    this.errors = errors
  }
}

interface ApiEnvelope<T> {
  status: "success" | "error"
  message?: string
  data?: T
  code?: string
  errors?: { field?: string; message: string }[]
}

export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!res.ok || body?.status === "error") {
    throw new ClientApiError(body?.message ?? "Request failed", body?.code ?? "UNKNOWN_ERROR", body?.errors)
  }

  return body?.data as T
}
