import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { numberParam, searchParams } from "@/lib/api/query"
import { getRequestContext } from "@/lib/auth/request-context"
import { listAudit } from "@/services/organization-service"

export async function GET(request: Request) {
  return runRoute(async () => {
    const params = searchParams(request)
    const result = await listAudit(await getRequestContext(), {
      page: numberParam(params, "page", 1),
      pageSize: numberParam(params, "pageSize", 20),
      search: params.get("search") ?? undefined,
      action: params.get("action") ?? undefined,
      userId: params.get("userId") ?? undefined,
      resource: params.get("resource") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    })
    return apiSuccess(result.data, result.pagination)
  })
}
