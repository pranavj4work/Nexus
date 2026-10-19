import "server-only"
import { cookies, headers } from "next/headers"
import { AppError } from "@/lib/api/errors"
import { COOKIES, accessCookieOptions } from "@/lib/auth/cookies"
import { readToken } from "@/lib/auth/tokens"
import { getConfigNumber } from "@/repositories/access"
import { findUserById } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { buildSessionPayload, contextFromAccessToken } from "@/services/auth-service"

export async function clientMeta() {
  const headerStore = await headers()
  return {
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
    userAgent: headerStore.get("user-agent") || "Browser",
  }
}

export async function getRequestContext() {
  const jar = await cookies()
  const token = jar.get(COOKIES.access)?.value
  if (!token) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  const claims = await readToken(token, "access").catch(() => null)
  if (!claims) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  const meta = await clientMeta()
  return contextFromAccessToken({
    userId: claims.sub,
    sessionId: claims.sid,
    organizationId: claims.org,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  })
}

export async function getServerSession() {
  try {
    const ctx = await getRequestContext()
    const user = findUserById(ctx.user.id)
    const session = getDb().sessions.find((item) => item.id === ctx.sessionId)
    if (!user || !session) return null
    return buildSessionPayload(user, ctx.organizationId, session, new Date(Date.now() + 15 * 60_000).toISOString())
  } catch {
    return null
  }
}

export async function setAuthCookies(tokens: { accessToken: string; refreshToken: string }) {
  const jar = await cookies()
  jar.set(COOKIES.access, tokens.accessToken, accessCookieOptions(15 * 60))
  jar.set(
    COOKIES.refresh,
    tokens.refreshToken,
    accessCookieOptions(getConfigNumber("AUTH_REFRESH_TOKEN_DAYS") * 86_400),
  )
}

export async function clearAuthCookies() {
  const jar = await cookies()
  jar.delete(COOKIES.access)
  jar.delete(COOKIES.refresh)
}
