import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIES } from "@/lib/auth/cookies"

export default async function HomePage() {
  const jar = await cookies()
  redirect(jar.get(COOKIES.access) || jar.get(COOKIES.refresh) ? "/dashboard" : "/login")
}
