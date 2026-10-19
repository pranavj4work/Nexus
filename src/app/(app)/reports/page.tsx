import { getTranslations } from "next-intl/server"
import { ReportsView } from "@/features/reports/reports-view"

export async function generateMetadata() {
  const t = await getTranslations("reports")
  return { title: t("title") }
}

export default function ReportsPage() {
  return <ReportsView />
}
