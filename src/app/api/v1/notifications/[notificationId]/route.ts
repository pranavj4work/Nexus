import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { getRequestContext } from "@/lib/auth/request-context"
import { deleteNotification, markNotificationRead } from "@/services/organization-service"

type Context = { params: Promise<{ notificationId: string }> }

export async function PATCH(_request: Request, context: Context) {
  return runRoute(async () => {
    const { notificationId } = await context.params
    return apiSuccess(await markNotificationRead(await getRequestContext(), notificationId))
  })
}

export async function DELETE(_request: Request, context: Context) {
  return runRoute(async () => {
    const { notificationId } = await context.params
    await deleteNotification(await getRequestContext(), notificationId)
    return apiSuccess({ deleted: true })
  })
}
