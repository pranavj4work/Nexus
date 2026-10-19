import { AppError } from "@/lib/api/errors"

export type RateLimitResult = {
  allowed: boolean
  retryAfterMs: number
  limit: number
  remaining: number
}

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): RateLimitResult
  reset(): void
}

type Bucket = { timestamps: number[] }

export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const buckets = new Map<string, Bucket>()
  return {
    consume(key, limit, windowMs) {
      const current = now()
      const bucket = buckets.get(key) ?? { timestamps: [] }
      bucket.timestamps = bucket.timestamps.filter((timestamp) => current - timestamp < windowMs)
      if (bucket.timestamps.length >= limit) {
        const retryAfterMs = Math.max(0, windowMs - (current - bucket.timestamps[0]))
        buckets.set(key, bucket)
        return { allowed: false, retryAfterMs, limit, remaining: 0 }
      }
      bucket.timestamps.push(current)
      buckets.set(key, bucket)
      return { allowed: true, retryAfterMs: 0, limit, remaining: limit - bucket.timestamps.length }
    },
    reset() {
      buckets.clear()
    },
  }
}

const POLICIES = {
  login: { limit: 5, windowMs: 60_000 },
  register: { limit: 5, windowMs: 60_000 },
  forgotPassword: { limit: 5, windowMs: 60_000 },
  resetPassword: { limit: 5, windowMs: 60_000 },
  search: { limit: 30, windowMs: 60_000 },
  notificationPoll: { limit: 60, windowMs: 60_000 },
} as const

export type RateLimitAction = keyof typeof POLICIES

const limiter = createMemoryRateLimiter()

export function consumeRateLimit(action: RateLimitAction, identity: string) {
  const policy = POLICIES[action]
  return limiter.consume(`${action}:${identity}`, policy.limit, policy.windowMs)
}

export function assertRateLimit(action: RateLimitAction, identity: string) {
  const result = consumeRateLimit(action, identity)
  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again later.")
  }
  return result
}

export function resetRateLimits() {
  limiter.reset()
}

export const rateLimitPolicies = POLICIES
