import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, taskUpdateSchema } from "@/schemas"
import { deleteTask, getTask, updateTask } from "@/services/task-service"

type Context = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, context: Context) {
  return runRoute(async () => {
    const { taskId } = await context.params
    return apiSuccess(await getTask(await getRequestContext(), taskId))
  })
}

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { taskId } = await context.params
    const input = parseInput(taskUpdateSchema, await request.json())
    return apiSuccess(await updateTask(await getRequestContext(), taskId, input))
  })
}

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { taskId } = await context.params
    await deleteTask(await getRequestContext(), taskId)
    return apiSuccess({ deleted: true })
  })
}
