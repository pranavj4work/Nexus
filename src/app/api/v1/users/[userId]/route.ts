import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { memberUpdateSchema, parseInput } from "@/schemas"
import { removeMember, updateMember } from "@/services/organization-service"

type Context = { params: Promise<{ userId: string }> }

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { userId } = await context.params
    const input = parseInput(memberUpdateSchema, await request.json())
    return apiSuccess(await updateMember(await getRequestContext(), userId, input))
  })
}

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { userId } = await context.params
    await removeMember(await getRequestContext(), userId)
    return apiSuccess({ removed: true })
  })
}
