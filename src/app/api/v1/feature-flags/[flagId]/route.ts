import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { flagUpdateSchema, parseInput } from "@/schemas"
import { updateFlag } from "@/services/organization-service"

type Context = { params: Promise<{ flagId: string }> }

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { flagId } = await context.params
    const input = parseInput(flagUpdateSchema, await request.json())
    return apiSuccess(await updateFlag(await getRequestContext(), flagId, input))
  })
}
