import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { configUpdateSchema, parseInput } from "@/schemas"
import { updateConfig } from "@/services/organization-service"

type Context = { params: Promise<{ key: string }> }

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { key } = await context.params
    const input = parseInput(configUpdateSchema, await request.json())
    return apiSuccess(await updateConfig(await getRequestContext(), key, input.value))
  })
}
