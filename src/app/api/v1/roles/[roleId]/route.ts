import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, rolePermissionsSchema } from "@/schemas"
import { updateRolePermissions } from "@/services/organization-service"

type Context = { params: Promise<{ roleId: string }> }

export async function PATCH(request: Request, context: Context) {
  return runRoute(async () => {
    const { roleId } = await context.params
    const input = parseInput(rolePermissionsSchema, await request.json())
    return apiSuccess(await updateRolePermissions(await getRequestContext(), roleId, input.permissions))
  })
}
