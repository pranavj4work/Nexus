import { NextResponse } from "next/server"
import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta, setAuthCookies } from "@/lib/auth/request-context"
import { COOKIES } from "@/lib/auth/cookies"
import { cookies } from "next/headers"
import { refreshSession } from "@/services/auth-service"

async function refresh() {
  const jar = await cookies()
  const token = jar.get(COOKIES.refresh)?.value
  if (!token) return null
  const result = await refreshSession(token, await clientMeta())
  await setAuthCookies(result)
  return result
}

export async function POST() {
  return runRoute(async () => {
    const result = await refresh()
    if (!result) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
    return apiSuccess({ refreshed: true })
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get("next"))
  const result = await refresh().catch(() => null)
  if (!result) {
    const { clearAuthCookies } = await import("@/lib/auth/request-context")
    await clearAuthCookies()
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.redirect(new URL(next, request.url))
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard"
  return value
}
