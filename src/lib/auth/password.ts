import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, hash] = encoded.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, "hex")
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
