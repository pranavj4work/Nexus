import { ApiError } from "@/lib/api/client"

export function errorText(t: (key: string) => string, error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "RATE_LIMITED") return t("rateLimited")
    if (error.code === "FORBIDDEN") return t("forbidden")
    if (error.code === "NOT_FOUND") return t("notFound")
    if (error.code === "CONFLICT") return t("conflict")
    if (error.code === "VALIDATION") return t("validation")
  }
  return t("generic")
}

export function fieldText(t: (key: string) => string, message?: string) {
  if (!message) return undefined
  return message.startsWith("validation.") ? t(message.slice("validation.".length)) : message
}
