import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function NotFound() {
  const t = await getTranslations("errors")
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">{t("notFound")}</h1>
      <Link href="/dashboard" className="mt-4 text-sm underline">
        Nexus
      </Link>
    </main>
  )
}
