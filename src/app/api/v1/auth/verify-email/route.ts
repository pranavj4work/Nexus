import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { parseInput, verifySchema } from "@/schemas"
import { verifyEmail } from "@/services/auth-service"

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(verifySchema, await request.json())
    return apiSuccess(await verifyEmail(input.token))
  })
}
