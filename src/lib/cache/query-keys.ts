export const queryKeys = {
  session: ["session"] as const,
  projects: (organizationId: string, params?: unknown) => ["projects", organizationId, params ?? {}] as const,
  project: (organizationId: string, projectId: string) => ["projects", organizationId, projectId] as const,
  tasks: (organizationId: string, params?: unknown) => ["tasks", organizationId, params ?? {}] as const,
  task: (organizationId: string, taskId: string) => ["task", organizationId, taskId] as const,
  dashboard: (organizationId: string, range?: unknown) => ["dashboard", organizationId, range ?? {}] as const,
  reports: (organizationId: string, params?: unknown) => ["reports", organizationId, params ?? {}] as const,
  notifications: (organizationId: string, userId: string) => ["notifications", organizationId, userId] as const,
  users: (organizationId: string, params?: unknown) => ["users", organizationId, params ?? {}] as const,
  sessions: (userId: string) => ["sessions", userId] as const,
  audit: (organizationId: string, params?: unknown) => ["audit", organizationId, params ?? {}] as const,
  flags: ["feature-flags"] as const,
  config: ["system-config"] as const,
  search: (organizationId: string, query: string) => ["search", organizationId, query] as const,
}

export const cacheTimes = {
  session: 60_000,
  lists: 30_000,
  dashboard: 60_000,
  notifications: 10_000,
  config: 5 * 60_000,
  flags: 60_000,
  gcTime: 5 * 60_000,
}
