export const COOKIES = {
  access: "nexus_access",
  refresh: "nexus_refresh",
  locale: "nexus_locale",
} as const

export function accessCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}
