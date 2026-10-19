import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { COOKIES } from "@/lib/auth/cookies"
import { getServerSession } from "@/lib/auth/request-context"
import { AuthProvider } from "@/providers/auth-provider"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) {
    const jar = await cookies()
    if (jar.get(COOKIES.refresh)) {
      const pathname = (await headers()).get("x-pathname") || "/dashboard"
      redirect(`/api/v1/auth/refresh?next=${encodeURIComponent(pathname)}`)
    }
    redirect("/login")
  }
  return (
    <AuthProvider initial={session}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
