import { readFileSync } from "node:fs"
import path from "node:path"
import type {
  Attachment,
  AuditLog,
  Comment,
  Database,
  FeatureFlag,
  Membership,
  AppNotification,
  NotificationPreference,
  Organization,
  OrgTheme,
  PermissionDefinition,
  Project,
  Role,
  Session,
  SystemConfig,
  Task,
  User,
} from "@/types/domain"

type GlobalStore = typeof globalThis & { __nexusDb?: Database }

function readJson<T>(name: string): T {
  const file = path.join(process.cwd(), "src", "data", name)
  return JSON.parse(readFileSync(file, "utf8")) as T
}

function load(): Database {
  return {
    users: readJson<User[]>("users.json"),
    organizations: readJson<Organization[]>("organizations.json"),
    memberships: readJson<Membership[]>("memberships.json"),
    roles: readJson<Role[]>("roles.json"),
    permissions: readJson<PermissionDefinition[]>("permissions.json"),
    projects: readJson<Project[]>("projects.json"),
    tasks: readJson<Task[]>("tasks.json"),
    comments: readJson<Comment[]>("comments.json"),
    notifications: readJson<AppNotification[]>("notifications.json"),
    sessions: readJson<Session[]>("sessions.json"),
    auditLogs: readJson<AuditLog[]>("audit-logs.json"),
    featureFlags: readJson<FeatureFlag[]>("feature-flags.json"),
    systemConfig: readJson<SystemConfig[]>("system-config.json"),
    themes: readJson<OrgTheme[]>("themes.json"),
    attachments: readJson<Attachment[]>("attachments.json"),
    notificationPreferences: readJson<NotificationPreference[]>("notification-preferences.json"),
    authTokens: [],
  }
}

export function getDb() {
  const store = globalThis as GlobalStore
  if (!store.__nexusDb) store.__nexusDb = load()
  return store.__nexusDb
}

export function resetStore() {
  ;(globalThis as GlobalStore).__nexusDb = load()
}
