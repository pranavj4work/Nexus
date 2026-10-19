import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { COOKIES } from "@/lib/auth/cookies"

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const access = request.cookies.get(COOKIES.access)?.value
  const refresh = request.cookies.get(COOKIES.refresh)?.value
  const authed = Boolean(access || refresh)
  const isAuthPage = AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
  const isPublic = pathname.startsWith("/api") || isAuthPage || pathname === "/"

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (authed && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
