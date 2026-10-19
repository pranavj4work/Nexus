import { cookies } from "next/headers"
import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { COOKIES } from "@/lib/auth/cookies"
import { getRequestContext } from "@/lib/auth/request-context"
import { LOCALES } from "@/types/domain"
import { parseInput, preferencesSchema } from "@/schemas"
import { updatePreferences } from "@/services/auth-service"
import { AppError } from "@/lib/api/errors"

export async function PATCH(request: Request) {
  return runRoute(async () => {
    const ctx = await getRequestContext()
    const input = parseInput(preferencesSchema, await request.json())
    const user = await updatePreferences(ctx, input)
    if (input.locale && LOCALES.includes(input.locale)) {
      const jar = await cookies()
      jar.set(COOKIES.locale, input.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    }
    return apiSuccess(user)
  })
}

export async function POST(request: Request) {
  return runRoute(async () => {
    const body = (await request.json().catch(() => null)) as { locale?: string } | null
    if (!body?.locale || !LOCALES.includes(body.locale as (typeof LOCALES)[number])) {
      throw new AppError("VALIDATION", "validation.invalid", { locale: "validation.required" })
    }
    const jar = await cookies()
    jar.set(COOKIES.locale, body.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    return apiSuccess({ locale: body.locale })
  })
}
