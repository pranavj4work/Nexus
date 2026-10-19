import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { commentSchema, parseInput } from "@/schemas"
import { addComment } from "@/services/task-service"

type Context = { params: Promise<{ taskId: string }> }

export async function POST(request: Request, context: Context) {
  return runRoute(async () => {
    const { taskId } = await context.params
    const input = parseInput(commentSchema, await request.json())
    return apiSuccess(await addComment(await getRequestContext(), taskId, input.body), undefined, 201)
  })
}
