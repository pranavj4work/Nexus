import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { attachmentSchema, parseInput } from "@/schemas"
import { addAttachment } from "@/services/task-service"

type Context = { params: Promise<{ taskId: string }> }

export async function POST(request: Request, context: Context) {
  return runRoute(async () => {
    const { taskId } = await context.params
    const input = parseInput(attachmentSchema, await request.json())
    return apiSuccess(await addAttachment(await getRequestContext(), taskId, input), undefined, 201)
  })
}
