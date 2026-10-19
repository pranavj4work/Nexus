import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { listRoles } from "@/services/organization-service"

export async function GET() {
  return runRoute(async () => apiSuccess(await listRoles(await getRequestContext())))
}
