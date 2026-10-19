import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { publicAuthConfig } from "@/services/organization-service"

export async function GET() {
  return runRoute(async () => apiSuccess(publicAuthConfig()))
}
