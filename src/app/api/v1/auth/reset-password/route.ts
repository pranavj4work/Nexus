import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta } from "@/lib/auth/request-context"
import { getConfigNumber } from "@/repositories/access"
import { parseInput, resetSchema } from "@/schemas"
import { resetPassword } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(resetSchema(getConfigNumber("AUTH_PASSWORD_MIN_LENGTH")), await request.json())
    return apiSuccess(await resetPassword({ ...input, ...(await clientMeta()) }))
  })
}
