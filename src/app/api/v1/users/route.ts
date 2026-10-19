import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { numberParam, oneOf, searchParams } from "@/lib/api/query"
import { getRequestContext } from "@/lib/auth/request-context"
import { inviteSchema, parseInput } from "@/schemas"
import { inviteUser, listUsers } from "@/services/organization-service"
import { USER_STATUSES } from "@/types/domain"

export async function GET(request: Request) {
  return runRoute(async () => {
    const params = searchParams(request)
    const result = await listUsers(await getRequestContext(), {
      page: numberParam(params, "page", 1),
      pageSize: numberParam(params, "pageSize", 20),
      search: params.get("search") ?? undefined,
      status: oneOf(params.get("status"), USER_STATUSES),
      roleId: params.get("roleId") ?? undefined,
    })
    return apiSuccess(result.data, result.pagination)
  })
}

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(inviteSchema, await request.json())
    return apiSuccess(await inviteUser(await getRequestContext(), input), undefined, 201)
  })
}
