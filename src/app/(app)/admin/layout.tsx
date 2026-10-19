import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth/request-context"
import { ADMIN_NAV, canSeeNav } from "@/lib/permissions/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  const pathname = (await headers()).get("x-pathname") ?? ""
  const item = ADMIN_NAV.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`))
  if (!session || !item || !canSeeNav(session.permissions, session.features, item)) {
    redirect("/dashboard")
  }
  return children
}
