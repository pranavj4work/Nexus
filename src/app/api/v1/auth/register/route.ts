import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta } from "@/lib/auth/request-context"
import { getConfigNumber } from "@/repositories/access"
import { parseInput, registerSchema } from "@/schemas"
import { register } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(registerSchema(getConfigNumber("AUTH_PASSWORD_MIN_LENGTH")), await request.json())
    const result = await register({ ...input, ...(await clientMeta()) })
    return apiSuccess(result, undefined, 201)
  })
}
