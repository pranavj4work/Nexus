import type { Pagination } from "@/types/domain"

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let refreshing: Promise<boolean> | null = null

async function refreshSession() {
  if (!refreshing) {
    refreshing = fetch("/api/v1/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export async function api<T>(path: string, init?: RequestInit, retry = true): Promise<{ data: T; pagination?: Pagination }> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (response.status === 401 && retry && !path.includes("/api/v1/auth/")) {
    const refreshed = await refreshSession()
    if (refreshed) return api<T>(path, init, false)
  }
  const body = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: T
    pagination?: Pagination
    error?: { code?: string; message?: string; fields?: Record<string, string> }
  } | null
  if (!response.ok || !body?.success) {
    throw new ApiError(
      body?.error?.code ?? "INTERNAL",
      body?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      body?.error?.fields,
    )
  }
  return { data: body.data as T, pagination: body.pagination }
}
