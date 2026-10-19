export const LOCALES = ["en", "hi", "ar", "fr"] as const
export type Locale = (typeof LOCALES)[number]

export const THEME_MODES = ["light", "dark", "system"] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const USER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
export type Priority = (typeof PRIORITIES)[number]

export const ROLE_KEYS = ["SUPER_ADMIN", "ORG_ADMIN", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export const PERMISSIONS = [
  "project:create",
  "project:read",
  "project:update",
  "project:delete",
  "task:create",
  "task:read",
  "task:update",
  "task:delete",
  "task:assign",
  "user:invite",
  "user:read",
  "user:update",
  "user:remove",
  "report:view",
  "settings:read",
  "settings:update",
  "audit:view",
  "feature_flag:read",
  "feature_flag:update",
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const FEATURE_FLAG_KEYS = [
  "FEATURE_KANBAN",
  "FEATURE_ANALYTICS",
  "FEATURE_GLOBAL_SEARCH",
  "FEATURE_NOTIFICATIONS",
  "FEATURE_FILE_ATTACHMENTS",
  "FEATURE_HIGH_CONTRAST",
  "FEATURE_AI_ASSISTANT",
] as const
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_COMMENTED",
  "TASK_MENTIONED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "PROJECT_UPDATED",
  "USER_INVITED",
  "SYSTEM_ALERT",
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const AUDIT_ACTIONS = [
  "USER_LOGIN",
  "USER_LOGOUT",
  "USER_INVITED",
  "USER_ROLE_CHANGED",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_DELETED",
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "TASK_STATUS_CHANGED",
  "SETTINGS_UPDATED",
  "FEATURE_FLAG_CHANGED",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const CONFIG_CATEGORIES = ["AUTHENTICATION", "PROJECTS", "TASKS", "NOTIFICATIONS", "UI"] as const
export type ConfigCategory = (typeof CONFIG_CATEGORIES)[number]
export type ConfigType = "NUMBER" | "BOOLEAN" | "STRING"

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  status: UserStatus
  title: string
  initials: string
  emailVerified: boolean
  locale: Locale
  theme: ThemeMode
  highContrast: boolean
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<User, "passwordHash">

export type Organization = {
  id: string
  name: string
  slug: string
  plan: "STARTER" | "PRO" | "ENTERPRISE"
  defaultLanguage: Locale
  defaultTheme: ThemeMode
  timezone: string
  createdAt: string
}

export type OrgTheme = {
  organizationId: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  logoText: string
  radius: string
  density: "comfortable" | "compact"
}

export type Membership = {
  id: string
  userId: string
  organizationId: string
  roleIds: string[]
  status: UserStatus
  joinedAt: string
}

export type Role = {
  id: string
  key: RoleKey
  name: string
  description: string
  permissions: Permission[]
}

export type PermissionDefinition = {
  key: Permission
  description: string
}

export type Project = {
  id: string
  organizationId: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  ownerId: string
  progress: number
  startDate: string
  dueDate: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

export type Task = {
  id: string
  organizationId: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assigneeId: string | null
  reporterId: string
  labels: string[]
  dueDate: string
  createdAt: string
  updatedAt: string
}

export type Comment = {
  id: string
  organizationId: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
}

export type Attachment = {
  id: string
  organizationId: string
  taskId: string
  fileName: string
  sizeBytes: number
  createdBy: string
  createdAt: string
}

export type AppNotification = {
  id: string
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  metadata: Record<string, string>
}

export type NotificationPreference = {
  userId: string
  organizationId: string
  emailEnabled: boolean
  inAppEnabled: boolean
  digestEnabled: boolean
}

export type Session = {
  id: string
  userId: string
  organizationId: string
  refreshTokenHash: string
  browser: string
  device: string
  location: string
  ipAddress: string
  userAgent: string
  lastActiveAt: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
}

export type AuditLog = {
  id: string
  organizationId: string
  userId: string
  action: AuditAction
  resource: string
  resourceId: string
  metadata: Record<string, string>
  ipAddress: string
  userAgent: string
  timestamp: string
}

export type FeatureFlag = {
  id: string
  key: FeatureFlagKey
  description: string
  enabled: boolean
  organizationIds: string[]
  updatedBy: string
  updatedAt: string
}

export type SystemConfig = {
  key: string
  category: ConfigCategory
  type: ConfigType
  value: number | boolean | string
  description: string
  updatedBy: string
  updatedAt: string
}

export type AuthToken = {
  id: string
  userId: string
  tokenHash: string
  purpose: "reset" | "verify"
  expiresAt: string
  usedAt: string | null
}

export type Database = {
  users: User[]
  organizations: Organization[]
  memberships: Membership[]
  roles: Role[]
  permissions: PermissionDefinition[]
  projects: Project[]
  tasks: Task[]
  comments: Comment[]
  notifications: AppNotification[]
  sessions: Session[]
  auditLogs: AuditLog[]
  featureFlags: FeatureFlag[]
  systemConfig: SystemConfig[]
  themes: OrgTheme[]
  attachments: Attachment[]
  notificationPreferences: NotificationPreference[]
  authTokens: AuthToken[]
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type RequestContext = {
  requestId: string
  user: PublicUser
  organizationId: string
  sessionId: string
  permissions: Permission[]
  roleKeys: RoleKey[]
  roles: Role[]
  ipAddress: string
  userAgent: string
}

export type SessionPayload = {
  user: PublicUser
  organization: Organization
  theme: OrgTheme
  organizations: Organization[]
  roles: Role[]
  permissions: Permission[]
  features: Record<FeatureFlagKey, boolean>
  session: {
    id: string
    expiresAt: string
    accessTokenExpiresAt: string
  }
}
