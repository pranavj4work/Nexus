import { simulateLatency } from "@/lib/delay"
import { AppError } from "@/lib/api/errors"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { readToken, signToken } from "@/lib/auth/tokens"
import { createId, createSecret, hashToken } from "@/lib/ids"
import { assertRateLimit } from "@/lib/rate-limit/rate-limit-service"
import {
  activeMemberships,
  canAccessOrganization,
  featureMap,
  findMembership,
  findUserByEmail,
  findUserById,
  getConfigBoolean,
  getConfigNumber,
  organizationsForUser,
  resolveMembershipAccess,
  toPublicUser,
} from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { describeClient, recordAudit } from "@/services/activity"
import type { Locale, Organization, RequestContext, Session, SessionPayload, ThemeMode, User } from "@/types/domain"

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function resetLoginAttempts() {
  loginAttempts.clear()
}

type ClientMeta = { ipAddress: string; userAgent: string }

function assertPasswordLength(password: string) {
  const min = getConfigNumber("AUTH_PASSWORD_MIN_LENGTH")
  if (password.length < min) {
    throw new AppError("VALIDATION", "validation.invalid", { password: "validation.passwordMin" })
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug || "org"
}

export async function issueSession(user: User, organizationId: string, meta: ClientMeta) {
  const db = getDb()
  const refreshSecret = createSecret()
  const client = describeClient(meta.userAgent)
  const now = new Date()
  const session: Session = {
    id: createId("ses"),
    userId: user.id,
    organizationId,
    refreshTokenHash: hashToken(refreshSecret),
    browser: client.browser,
    device: client.device,
    location: client.location,
    ipAddress: meta.ipAddress,
    userAgent: client.browser,
    lastActiveAt: now.toISOString(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + getConfigNumber("AUTH_REFRESH_TOKEN_DAYS") * 86_400_000).toISOString(),
    revokedAt: null,
  }
  db.sessions.unshift(session)
  const accessToken = await signToken({ sub: user.id, sid: session.id, org: organizationId, purpose: "access" }, "15m")
  const refreshToken = await signToken(
    { sub: user.id, sid: session.id, org: organizationId, purpose: "refresh" },
    `${getConfigNumber("AUTH_REFRESH_TOKEN_DAYS")}d`,
  )
  const signedRefresh = `${refreshToken}.${refreshSecret}`
  recordAudit(
    { organizationId, user: toPublicUser(user), ipAddress: meta.ipAddress, userAgent: client.browser },
    "USER_LOGIN",
    "USER",
    user.id,
  )
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60_000).toISOString()
  return { accessToken, refreshToken: signedRefresh, accessTokenExpiresAt, session }
}

function sessionIsActive(session: Session) {
  if (session.revokedAt) return false
  if (new Date(session.expiresAt).getTime() <= Date.now()) return false
  const idleMs = getConfigNumber("AUTH_SESSION_TIMEOUT") * 60_000
  return Date.now() - new Date(session.lastActiveAt).getTime() <= idleMs
}

export function touchSession(session: Session) {
  if (!sessionIsActive(session)) return false
  session.lastActiveAt = new Date().toISOString()
  return true
}

export async function login(input: { email: string; password: string } & ClientMeta) {
  await simulateLatency()
  assertRateLimit("login", input.ipAddress)
  const email = input.email.trim().toLowerCase()
  const maxAttempts = getConfigNumber("AUTH_MAX_LOGIN_ATTEMPTS")
  const current = loginAttempts.get(email)
  if (current && current.lockedUntil > Date.now()) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again later.")
  }
  const user = findUserByEmail(email)
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    const count = (current?.count ?? 0) + 1
    loginAttempts.set(email, {
      count,
      lockedUntil: count >= maxAttempts ? Date.now() + 60_000 : 0,
    })
    throw new AppError("UNAUTHENTICATED", "Email or password is incorrect.")
  }
  loginAttempts.delete(email)
  if (!user.emailVerified || user.status === "INVITED") {
    throw new AppError("FORBIDDEN", "Verify your email before signing in.")
  }
  if (user.status === "DISABLED" || user.status === "SUSPENDED") {
    throw new AppError("FORBIDDEN", "This account cannot sign in.")
  }
  const organizations = organizationsForUser(user.id)
  if (organizations.length === 0) throw new AppError("FORBIDDEN", "You do not belong to an organization.")
  if (getConfigBoolean("AUTH_MFA_REQUIRED")) {
    const challengeToken = await signToken(
      { sub: user.id, sid: "mfa", org: organizations[0].id, purpose: "mfa" },
      "5m",
    )
    return { mfaRequired: true as const, challengeToken }
  }
  const issued = await issueSession(user, organizations[0].id, input)
  return { mfaRequired: false as const, user: toPublicUser(user), ...issued }
}

export async function completeMfa(input: { challengeToken: string; code: string } & ClientMeta) {
  await simulateLatency()
  assertRateLimit("login", input.ipAddress)
  const claims = await readToken(input.challengeToken, "mfa").catch(() => null)
  if (!claims) throw new AppError("UNAUTHENTICATED", "The verification challenge expired.")
  if (input.code !== "000000") throw new AppError("VALIDATION", "validation.invalid", { code: "validation.mfa" })
  const user = findUserById(claims.sub)
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  const organizations = organizationsForUser(user.id)
  const issued = await issueSession(user, organizations[0]?.id ?? claims.org, input)
  return { mfaRequired: false as const, user: toPublicUser(user), ...issued }
}

export async function register(input: { name: string; email: string; password: string; organizationName: string } & ClientMeta) {
  await simulateLatency()
  assertRateLimit("register", input.ipAddress)
  assertPasswordLength(input.password)
  if (findUserByEmail(input.email)) throw new AppError("CONFLICT", "An account with this email already exists.")
  const db = getDb()
  const now = new Date().toISOString()
  const user: User = {
    id: createId("usr"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    status: "INVITED",
    title: "Member",
    initials: input.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    emailVerified: false,
    locale: "en",
    theme: "system",
    highContrast: false,
    createdAt: now,
    updatedAt: now,
  }
  const organization: Organization = {
    id: createId("org"),
    name: input.organizationName.trim(),
    slug: `${slugify(input.organizationName)}-${user.id.slice(-4)}`,
    plan: "STARTER",
    defaultLanguage: "en",
    defaultTheme: "system",
    timezone: "UTC",
    createdAt: now,
  }
  db.users.unshift(user)
  db.organizations.unshift(organization)
  db.memberships.unshift({
    id: createId("mem"),
    userId: user.id,
    organizationId: organization.id,
    roleIds: ["role_org_admin"],
    status: "INVITED",
    joinedAt: now,
  })
  db.themes.unshift({
    organizationId: organization.id,
    primary: "oklch(0.45 0.14 255)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.94 0.02 255)",
    secondaryForeground: "oklch(0.28 0.04 255)",
    logoText: organization.name.slice(0, 12),
    radius: "0.5rem",
    density: "comfortable",
  })
  const token = createSecret()
  db.authTokens.unshift({
    id: createId("tok"),
    userId: user.id,
    tokenHash: hashToken(token),
    purpose: "verify",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    usedAt: null,
  })
  return { devVerificationPath: `/verify-email?token=${token}` }
}

export async function verifyEmail(token: string) {
  await simulateLatency()
  const db = getDb()
  const record = db.authTokens.find((item) => item.purpose === "verify" && item.tokenHash === hashToken(token) && !item.usedAt)
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    throw new AppError("VALIDATION", "This verification link is invalid or expired.")
  }
  const user = findUserById(record.userId)
  if (!user) throw new AppError("NOT_FOUND", "Account not found.")
  user.emailVerified = true
  user.status = "ACTIVE"
  user.updatedAt = new Date().toISOString()
  record.usedAt = new Date().toISOString()
  for (const membership of db.memberships.filter((item) => item.userId === user.id && item.status === "INVITED")) {
    membership.status = "ACTIVE"
  }
  return { verified: true }
}

export async function forgotPassword(input: { email: string } & ClientMeta) {
  await simulateLatency()
  assertRateLimit("forgotPassword", input.ipAddress)
  const user = findUserByEmail(input.email)
  if (!user) return { sent: true as const }
  const token = createSecret()
  getDb().authTokens.unshift({
    id: createId("tok"),
    userId: user.id,
    tokenHash: hashToken(token),
    purpose: "reset",
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    usedAt: null,
  })
  return { sent: true as const, devResetPath: `/reset-password?token=${token}` }
}

export async function resetPassword(input: { token: string; password: string } & ClientMeta) {
  await simulateLatency()
  assertRateLimit("resetPassword", input.ipAddress)
  assertPasswordLength(input.password)
  const db = getDb()
  const record = db.authTokens.find((item) => item.purpose === "reset" && item.tokenHash === hashToken(input.token) && !item.usedAt)
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    throw new AppError("VALIDATION", "This reset link is invalid or expired.")
  }
  const user = findUserById(record.userId)
  if (!user) throw new AppError("NOT_FOUND", "Account not found.")
  user.passwordHash = hashPassword(input.password)
  user.updatedAt = new Date().toISOString()
  record.usedAt = new Date().toISOString()
  for (const session of db.sessions.filter((item) => item.userId === user.id && !item.revokedAt)) {
    session.revokedAt = new Date().toISOString()
  }
  return { reset: true }
}

export async function refreshSession(refreshValue: string, meta: ClientMeta) {
  await simulateLatency()
  const splitAt = refreshValue.lastIndexOf(".")
  const jwt = splitAt > 0 ? refreshValue.slice(0, splitAt) : ""
  const secret = splitAt > 0 ? refreshValue.slice(splitAt + 1) : ""
  if (!jwt || !secret) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  const claims = await readToken(jwt, "refresh").catch(() => null)
  const session = getDb().sessions.find((item) => item.id === claims?.sid)
  if (!claims || !session || session.refreshTokenHash !== hashToken(secret) || session.revokedAt) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new AppError("UNAUTHENTICATED", "Your session has expired.")
  }
  const user = findUserById(session.userId)
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  const nextSecret = createSecret()
  session.refreshTokenHash = hashToken(nextSecret)
  session.lastActiveAt = new Date().toISOString()
  session.ipAddress = meta.ipAddress
  const accessToken = await signToken(
    { sub: user.id, sid: session.id, org: session.organizationId, purpose: "access" },
    "15m",
  )
  const refreshToken = await signToken(
    { sub: user.id, sid: session.id, org: session.organizationId, purpose: "refresh" },
    `${getConfigNumber("AUTH_REFRESH_TOKEN_DAYS")}d`,
  )
  return {
    accessToken,
    refreshToken: `${refreshToken}.${nextSecret}`,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
}

export function buildSessionPayload(user: User, organizationId: string, session: Session, accessTokenExpiresAt: string): SessionPayload {
  const membership = findMembership(user.id, organizationId)
  const access = membership ? resolveMembershipAccess(membership.roleIds) : { roles: [], permissions: [], roleKeys: [] }
  const organization = getDb().organizations.find((item) => item.id === organizationId)
  const theme = getDb().themes.find((item) => item.organizationId === organizationId)
  if (!organization || !theme) throw new AppError("NOT_FOUND", "Organization not found.")
  return {
    user: toPublicUser(user),
    organization,
    theme,
    organizations: organizationsForUser(user.id),
    roles: access.roles,
    permissions: access.permissions,
    features: featureMap(organizationId),
    session: { id: session.id, expiresAt: session.expiresAt, accessTokenExpiresAt },
  }
}

export async function switchOrganization(ctx: RequestContext, organizationId: string) {
  await simulateLatency()
  if (!canAccessOrganization(ctx.user.id, organizationId)) {
    throw new AppError("FORBIDDEN", "You cannot access that organization.")
  }
  const user = findUserById(ctx.user.id)
  const session = getDb().sessions.find((item) => item.id === ctx.sessionId)
  if (!user || !session) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  session.organizationId = organizationId
  const refreshSecret = createSecret()
  session.refreshTokenHash = hashToken(refreshSecret)
  const accessToken = await signToken({ sub: user.id, sid: session.id, org: organizationId, purpose: "access" }, "15m")
  const refreshToken = await signToken(
    { sub: user.id, sid: session.id, org: organizationId, purpose: "refresh" },
    `${getConfigNumber("AUTH_REFRESH_TOKEN_DAYS")}d`,
  )
  return {
    accessToken,
    refreshToken: `${refreshToken}.${refreshSecret}`,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    payload: buildSessionPayload(user, organizationId, session, new Date(Date.now() + 15 * 60_000).toISOString()),
  }
}

export async function logout(ctx: RequestContext, allDevices = false) {
  await simulateLatency()
  const now = new Date().toISOString()
  for (const session of getDb().sessions) {
    if (session.userId !== ctx.user.id || session.revokedAt) continue
    if (allDevices || session.id === ctx.sessionId) session.revokedAt = now
  }
  recordAudit(ctx, "USER_LOGOUT", "USER", ctx.user.id, { allDevices: String(allDevices) })
}

export async function revokeSession(ctx: RequestContext, sessionId: string) {
  await simulateLatency()
  const session = getDb().sessions.find((item) => item.id === sessionId)
  if (!session) throw new AppError("NOT_FOUND", "Session not found.")
  const owns = session.userId === ctx.user.id
  if (!owns && !ctx.permissions.includes("user:update")) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.")
  }
  if (!owns && findMembership(session.userId, ctx.organizationId)?.organizationId !== ctx.organizationId) {
    throw new AppError("NOT_FOUND", "Session not found.")
  }
  session.revokedAt = new Date().toISOString()
}

export async function revokeOtherSessions(ctx: RequestContext) {
  await simulateLatency()
  const now = new Date().toISOString()
  for (const session of getDb().sessions) {
    if (session.userId === ctx.user.id && session.id !== ctx.sessionId && !session.revokedAt) {
      session.revokedAt = now
    }
  }
}

export async function listSessions(ctx: RequestContext, userId = ctx.user.id) {
  await simulateLatency()
  if (userId !== ctx.user.id && !ctx.permissions.includes("user:read")) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.")
  }
  return getDb()
    .sessions.filter((session) => session.userId === userId && !session.revokedAt)
    .map((session) => ({
      id: session.id,
      browser: session.browser,
      device: session.device,
      location: session.location,
      ipAddress: session.ipAddress,
      lastActiveAt: session.lastActiveAt,
      current: session.id === ctx.sessionId,
    }))
}

export async function updatePreferences(
  ctx: RequestContext,
  input: {
    locale?: Locale
    theme?: ThemeMode
    highContrast?: boolean
    emailEnabled?: boolean
    inAppEnabled?: boolean
    digestEnabled?: boolean
  },
) {
  await simulateLatency()
  const user = findUserById(ctx.user.id)
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  if (input.highContrast && !featureMap(ctx.organizationId).FEATURE_HIGH_CONTRAST) {
    throw new AppError("FORBIDDEN", "This feature is not enabled for your organization.")
  }
  if (input.locale) user.locale = input.locale
  if (input.theme) user.theme = input.theme
  if (typeof input.highContrast === "boolean") user.highContrast = input.highContrast
  user.updatedAt = new Date().toISOString()
  const prefs = getDb().notificationPreferences.find(
    (item) => item.userId === ctx.user.id && item.organizationId === ctx.organizationId,
  )
  if (prefs) {
    if (typeof input.emailEnabled === "boolean") prefs.emailEnabled = input.emailEnabled
    if (typeof input.inAppEnabled === "boolean") prefs.inAppEnabled = input.inAppEnabled
    if (typeof input.digestEnabled === "boolean") prefs.digestEnabled = input.digestEnabled
  }
  recordAudit(ctx, "SETTINGS_UPDATED", "USER", user.id, { scope: "preferences" })
  return toPublicUser(user)
}

export function contextFromAccessToken(input: {
  userId: string
  sessionId: string
  organizationId: string
  ipAddress: string
  userAgent: string
}): RequestContext {
  const user = findUserById(input.userId)
  const session = getDb().sessions.find((item) => item.id === input.sessionId)
  if (!user || !session || session.userId !== user.id || !touchSession(session)) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.")
  }
  if (user.status === "DISABLED" || user.status === "SUSPENDED") {
    throw new AppError("UNAUTHENTICATED", "This account cannot sign in.")
  }
  if (!canAccessOrganization(user.id, input.organizationId)) {
    throw new AppError("FORBIDDEN", "You cannot access that organization.")
  }
  const membership = findMembership(user.id, input.organizationId)
  const superAdmin = activeMemberships(user.id).some((item) =>
    resolveMembershipAccess(item.roleIds).roleKeys.includes("SUPER_ADMIN"),
  )
  const access = membership
    ? resolveMembershipAccess(membership.roleIds)
    : superAdmin
      ? resolveMembershipAccess(["role_super_admin"])
      : { roles: [], permissions: [], roleKeys: [] }
  if (!membership || membership.status !== "ACTIVE") {
    if (!superAdmin) throw new AppError("FORBIDDEN", "You are not an active member of this organization.")
  }
  return {
    requestId: createId("req"),
    user: toPublicUser(user),
    organizationId: input.organizationId,
    sessionId: session.id,
    permissions: access.permissions,
    roleKeys: access.roleKeys,
    roles: access.roles,
    ipAddress: input.ipAddress,
    userAgent: describeClient(input.userAgent).browser,
  }
}
