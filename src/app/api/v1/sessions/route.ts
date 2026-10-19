import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { searchParams } from "@/lib/api/query"
import { listSessions, revokeOtherSessions } from "@/services/auth-service"

export async function GET(request: Request) {
  return runRoute(async () => {
    const userId = searchParams(request).get("userId") ?? undefined
    return apiSuccess(await listSessions(await getRequestContext(), userId))
  })
}

export async function DELETE() {
  return runRoute(async () => {
    await revokeOtherSessions(await getRequestContext())
    return apiSuccess({ revoked: true })
  })
}
