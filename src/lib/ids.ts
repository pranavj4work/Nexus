import { createHash, randomBytes, randomUUID } from "node:crypto"

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function createSecret() {
  return randomBytes(32).toString("hex")
}
