import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta, getRequestContext } from "@/lib/auth/request-context"
import { listNotifications, markAllNotificationsRead } from "@/services/organization-service"

export async function GET() {
  return runRoute(async () => {
    const meta = await clientMeta()
    return apiSuccess(await listNotifications(await getRequestContext(), meta.ipAddress))
  })
}

export async function POST() {
  return runRoute(async () => {
    const ctx = await getRequestContext()
    await markAllNotificationsRead(ctx)
    return apiSuccess({ read: true })
  })
}
