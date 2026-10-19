import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { findUserById } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { buildSessionPayload } from "@/services/auth-service"

export async function GET() {
  return runRoute(async () => {
    const ctx = await getRequestContext()
    const user = findUserById(ctx.user.id)
    const session = getDb().sessions.find((item) => item.id === ctx.sessionId)
    if (!user || !session) throw new Error("Missing session")
    return apiSuccess(buildSessionPayload(user, ctx.organizationId, session, new Date(Date.now() + 15 * 60_000).toISOString()))
  })
}
