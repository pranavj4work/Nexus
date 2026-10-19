import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { LOCALES, type Locale } from "@/types/domain"

export default getRequestConfig(async () => {
  const jar = await cookies()
  const requested = jar.get("nexus_locale")?.value
  const locale: Locale = LOCALES.includes(requested as Locale) ? (requested as Locale) : "en"
  const messages = (await import(`../messages/${locale}.json`)).default
  return { locale, messages }
})
