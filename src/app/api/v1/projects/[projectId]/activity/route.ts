import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { projectActivity } from "@/services/organization-service"

type Context = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    return apiSuccess(await projectActivity(await getRequestContext(), projectId))
  })
}
