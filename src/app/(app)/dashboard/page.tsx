import { DashboardView } from "@/features/dashboard/dashboard-view"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("dashboard")
  return { title: t("title") }
}

export default function DashboardPage() {
  return <DashboardView />
}
