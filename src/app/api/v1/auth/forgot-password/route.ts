import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { clientMeta } from "@/lib/auth/request-context"
import { forgotSchema, parseInput } from "@/schemas"
import { forgotPassword } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(forgotSchema, await request.json())
    return apiSuccess(await forgotPassword({ ...input, ...(await clientMeta()) }))
  })
}
