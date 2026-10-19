import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta, setAuthCookies } from "@/lib/auth/request-context"
import { mfaSchema, parseInput } from "@/schemas"
import { completeMfa } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(mfaSchema, await request.json())
    const result = await completeMfa({ ...input, ...(await clientMeta()) })
    await setAuthCookies(result)
    return apiSuccess({ mfaRequired: false, user: result.user })
  })
}
