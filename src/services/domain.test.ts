import { beforeEach, describe, expect, it } from "vitest"
import { verifyPassword } from "@/lib/auth/password"
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions"
import { createMemoryRateLimiter, resetRateLimits } from "@/lib/rate-limit/rate-limit-service"
import { resetLoginAttempts, login } from "@/services/auth-service"
import { configurationService } from "@/services/configuration-service"
import { listConfig, listFlags, updateRolePermissions } from "@/services/organization-service"
import { isFeatureEnabledForOrg } from "@/services/feature-flag-service"
import { createProject, getProject } from "@/services/project-service"
import { getReport } from "@/services/report-service"
import { createTask, updateTask } from "@/services/task-service"
import { findUserByEmail, featureMap, resolveMembershipAccess } from "@/repositories/access"
import { visibleNavigation } from "@/lib/permissions/navigation"
import { getDb, resetStore } from "@/repositories/store"
import type { RequestContext } from "@/types/domain"

const meta = { ipAddress: "203.0.113.10", userAgent: "vitest" }

function context(email: string, organizationId: string): RequestContext {
  const user = findUserByEmail(email)
  if (!user) throw new Error(`Missing ${email}`)
  const membership = getDb().memberships.find((item) => item.userId === user.id && item.organizationId === organizationId)
  if (!membership) throw new Error("Missing membership")
  const access = resolveMembershipAccess(membership.roleIds)
  const { passwordHash, ...publicUser } = user
  void passwordHash
  return {
    requestId: "req_test",
    user: publicUser,
    organizationId,
    sessionId: "ses_test",
    permissions: access.permissions,
    roleKeys: access.roleKeys,
    roles: access.roles,
    ipAddress: "203.0.113.10",
    userAgent: "Vitest",
  }
}

beforeEach(() => {
  resetStore()
  resetRateLimits()
  resetLoginAttempts()
})

describe("permissions", () => {
  it("updates a role and the next session for that role", async () => {
    const admin = context("admin@nexus.demo", "org_acme")
    const developer = getDb().roles.find((role) => role.key === "DEVELOPER")
    const superAdmin = getDb().roles.find((role) => role.key === "SUPER_ADMIN")
    if (!developer || !superAdmin) throw new Error("Missing role")
    const updated = await updateRolePermissions(admin, developer.id, ["project:read", "task:read", "report:view"])
    expect(updated.permissions).toEqual(["project:read", "task:read", "report:view"])
    expect(context("developer@nexus.demo", "org_acme").permissions).toEqual(["project:read", "task:read", "report:view"])
    expect(visibleNavigation(context("developer@nexus.demo", "org_acme").permissions, featureMap("org_acme")).main.map((item) => item.href)).toContain("/reports")
    await expect(updateRolePermissions(admin, superAdmin.id, ["project:read"])).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(context("admin@nexus.demo", "org_acme").permissions).toContain("feature_flag:update")
  })

  it("checks one, any, and all permissions", () => {
    const permissions = context("developer@nexus.demo", "org_acme").permissions
    expect(hasPermission(permissions, "task:update")).toBe(true)
    expect(hasPermission(permissions, "project:delete")).toBe(false)
    expect(hasAnyPermission(permissions, ["project:delete", "task:read"])).toBe(true)
    expect(hasAllPermissions(permissions, ["task:read", "task:update"])).toBe(true)
    expect(hasAllPermissions(permissions, ["task:read", "project:create"])).toBe(false)
  })
})

describe("authentication", () => {
  it("signs in a demo developer and rejects a bad password", async () => {
    const success = await login({ email: "developer@nexus.demo", password: "NexusDemo!2026", ...meta })
    expect(success.mfaRequired).toBe(false)
    if (!success.mfaRequired) expect(success.user.email).toBe("developer@nexus.demo")
    await expect(login({ email: "developer@nexus.demo", password: "wrong-password", ...meta, ipAddress: "203.0.113.11" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    })
  })

  it("verifies the seeded password hash", () => {
    const user = findUserByEmail("admin@nexus.demo")
    expect(user && verifyPassword("NexusDemo!2026", user.passwordHash)).toBe(true)
  })
})

describe("organization isolation", () => {
  it("hides another organization's project", async () => {
    const acme = context("developer@nexus.demo", "org_acme")
    await expect(getProject(acme, "prj_007")).rejects.toMatchObject({ code: "NOT_FOUND" })
    const own = await getProject(acme, "prj_001")
    expect(own.organizationId).toBe("org_acme")
  })

  it("blocks a viewer from creating a project", async () => {
    const viewer = context("viewer@nexus.demo", "org_acme")
    await expect(
      createProject(viewer, {
        name: "Should fail",
        description: "Viewers cannot create projects.",
        priority: "LOW",
        startDate: "2026-10-06",
        dueDate: "2026-12-01",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

describe("tasks", () => {
  it("creates a task and records a status change", async () => {
    const manager = context("pm@nexus.demo", "org_acme")
    const task = await createTask(manager, {
      projectId: "prj_001",
      title: "Cover task mutation",
      description: "Created from the service test.",
      dueDate: "2026-10-20",
      labels: ["testing"],
    })
    const updated = await updateTask(manager, task.id, { status: "IN_REVIEW" })
    expect(updated.status).toBe("IN_REVIEW")
    const audit = getDb().auditLogs.find((item) => item.resourceId === task.id && item.action === "TASK_STATUS_CHANGED")
    expect(audit?.metadata.newStatus).toBe("IN_REVIEW")
  })
})

describe("feature flags and configuration", () => {
  it("scopes analytics and keeps the assistant disabled", () => {
    expect(isFeatureEnabledForOrg("org_acme", "FEATURE_ANALYTICS")).toBe(true)
    expect(isFeatureEnabledForOrg("org_initech", "FEATURE_ANALYTICS")).toBe(false)
    expect(isFeatureEnabledForOrg("org_acme", "FEATURE_AI_ASSISTANT")).toBe(false)
  })

  it("reads system configuration from the store", () => {
    expect(configurationService.number("AUTH_SESSION_TIMEOUT")).toBe(30)
    expect(configurationService.boolean("AUTH_MFA_REQUIRED")).toBe(false)
    expect(configurationService.string("TASKS_DEFAULT_PRIORITY")).toBe("MEDIUM")
  })
})

describe("navigation", () => {
  it("shows the admin menu only to roles that can manage the organization", () => {
    const features = featureMap("org_acme")
    const hrefs = (email: string) => {
      const nav = visibleNavigation(context(email, "org_acme").permissions, features)
      return { main: nav.main.map((item) => item.href), admin: nav.admin.map((item) => item.href) }
    }

    expect(hrefs("viewer@nexus.demo").admin).toEqual([])
    expect(hrefs("viewer@nexus.demo").main).toContain("/reports")
    expect(hrefs("developer@nexus.demo").admin).toEqual([])
    expect(hrefs("developer@nexus.demo").main).not.toContain("/reports")
    expect(hrefs("pm@nexus.demo").admin).toEqual([])
    expect(hrefs("manager@nexus.demo").admin).toEqual([
      "/admin/users",
      "/admin/roles",
      "/admin/permissions",
      "/admin/audit-logs",
    ])
    expect(hrefs("admin@nexus.demo").admin).toEqual([
      "/admin/users",
      "/admin/roles",
      "/admin/permissions",
      "/admin/feature-flags",
      "/admin/configuration",
      "/admin/audit-logs",
    ])
  })

  it("reserves feature flags and system configuration for the super admin", async () => {
    const manager = context("manager@nexus.demo", "org_acme")
    await expect(listFlags(manager)).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(listConfig(manager)).rejects.toMatchObject({ code: "FORBIDDEN" })
    const admin = context("admin@nexus.demo", "org_acme")
    expect((await listFlags(admin)).length).toBeGreaterThan(0)
    expect((await listConfig(admin)).length).toBeGreaterThan(0)
  })
})
describe("reports", () => {
  it("returns delivery rows for a viewer and blocks a developer", async () => {
    const viewer = context("viewer@nexus.demo", "org_acme")
    const report = await getReport(viewer, { from: "2026-09-01T00:00:00.000Z", to: "2026-10-06T00:00:00.000Z" })
    expect(report.projects.length).toBeGreaterThan(0)
    expect(report.tasks.some((task) => task.overdue)).toBe(true)
    expect(report.workload.length).toBeGreaterThan(0)
    const developer = context("developer@nexus.demo", "org_acme")
    await expect(getReport(developer, { from: "2026-09-01T00:00:00.000Z", to: "2026-10-06T00:00:00.000Z" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})

describe("rate limiting", () => {
  it("allows five login attempts per minute and blocks the sixth", () => {
    const limiter = createMemoryRateLimiter(() => 1_000)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.consume("login:test", 5, 60_000).allowed).toBe(true)
    }
    expect(limiter.consume("login:test", 5, 60_000).allowed).toBe(false)
  })
})
