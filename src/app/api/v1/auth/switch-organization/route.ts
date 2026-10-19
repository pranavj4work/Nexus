import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext, setAuthCookies } from "@/lib/auth/request-context"
import { parseInput, switchOrgSchema } from "@/schemas"
import { switchOrganization } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const ctx = await getRequestContext()
    const input = parseInput(switchOrgSchema, await request.json())
    const result = await switchOrganization(ctx, input.organizationId)
    await setAuthCookies(result)
    return apiSuccess(result.payload)
  })
}
