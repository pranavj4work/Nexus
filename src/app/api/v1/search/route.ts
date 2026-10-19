import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { searchParams } from "@/lib/api/query"
import { clientMeta, getRequestContext } from "@/lib/auth/request-context"
import { searchAll } from "@/services/organization-service"

export async function GET(request: Request) {
  return runRoute(async () => {
    const meta = await clientMeta()
    const query = searchParams(request).get("q") ?? ""
    return apiSuccess(await searchAll(await getRequestContext(), query, meta.ipAddress))
  })
}
