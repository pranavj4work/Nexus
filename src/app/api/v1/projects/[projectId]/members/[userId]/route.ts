import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { removeProjectMember } from "@/services/project-service"

type Context = { params: Promise<{ projectId: string; userId: string }> }

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId, userId } = await context.params
    return apiSuccess(await removeProjectMember(await getRequestContext(), projectId, userId))
  })
}
