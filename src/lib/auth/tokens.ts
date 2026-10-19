import { SignJWT, jwtVerify } from "jose"

export type AccessClaims = {
  sub: string
  sid: string
  org: string
  purpose: "access" | "refresh" | "mfa"
}

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "nexus-dev-only-secret-change-me")
}

export async function signToken(claims: AccessClaims, expiresIn: string) {
  return new SignJWT({ sid: claims.sid, org: claims.org, purpose: claims.purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret())
}

export async function readToken(token: string, purpose: AccessClaims["purpose"]) {
  const { payload } = await jwtVerify(token, secret())
  if (payload.purpose !== purpose || typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    return null
  }
  return {
    sub: payload.sub,
    sid: String(payload.sid),
    org: String(payload.org ?? ""),
    purpose,
    exp: typeof payload.exp === "number" ? payload.exp : 0,
  }
}
