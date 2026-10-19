import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, projectMemberSchema } from "@/schemas"
import { addProjectMember, listProjectMembers } from "@/services/project-service"

type Context = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    return apiSuccess(await listProjectMembers(await getRequestContext(), projectId))
  })
}

export async function POST(request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    const input = parseInput(projectMemberSchema, await request.json())
    return apiSuccess(await addProjectMember(await getRequestContext(), projectId, input.userId))
  })
}
