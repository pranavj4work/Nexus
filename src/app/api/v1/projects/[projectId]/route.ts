import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, projectUpdateSchema } from "@/schemas"
import { deleteProject, getProject, updateProject } from "@/services/project-service"

type Context = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    return apiSuccess(await getProject(await getRequestContext(), projectId))
  })
}

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    const input = parseInput(projectUpdateSchema, await request.json())
    return apiSuccess(await updateProject(await getRequestContext(), projectId, input))
  })
}

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { projectId } = await context.params
    await deleteProject(await getRequestContext(), projectId)
    return apiSuccess({ deleted: true })
  })
}
