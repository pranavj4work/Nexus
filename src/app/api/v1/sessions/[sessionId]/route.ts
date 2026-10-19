import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { revokeSession } from "@/services/auth-service"

type Context = { params: Promise<{ sessionId: string }> }

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { sessionId } = await context.params
    await revokeSession(await getRequestContext(), sessionId)
    return apiSuccess({ revoked: true })
  })
}
