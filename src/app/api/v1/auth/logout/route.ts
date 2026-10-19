import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clearAuthCookies, getRequestContext } from "@/lib/auth/request-context"
import { logout } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const ctx = await getRequestContext()
    const body = (await request.json().catch(() => ({}))) as { allDevices?: boolean }
    await logout(ctx, Boolean(body.allDevices))
    await clearAuthCookies()
    return apiSuccess({ loggedOut: true })
  })
}
