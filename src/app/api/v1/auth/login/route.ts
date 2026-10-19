import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta, setAuthCookies } from "@/lib/auth/request-context"
import { loginSchema, parseInput } from "@/schemas"
import { login } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(loginSchema, await request.json())
    const result = await login({ ...input, ...(await clientMeta()) })
    if (result.mfaRequired) {
      return apiSuccess({ mfaRequired: true, challengeToken: result.challengeToken })
    }
    await setAuthCookies(result)
    return apiSuccess({ mfaRequired: false, user: result.user })
  })
}
