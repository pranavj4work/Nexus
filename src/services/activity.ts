import { createId } from "@/lib/ids"
import { getDb } from "@/repositories/store"
import type { AppNotification, AuditAction, AuditLog, NotificationType, RequestContext } from "@/types/domain"

export function recordAudit(
  ctx: Pick<RequestContext, "organizationId" | "user" | "ipAddress" | "userAgent">,
  action: AuditAction,
  resource: string,
  resourceId: string,
  metadata: Record<string, string> = {},
) {
  const entry: AuditLog = {
    id: createId("aud"),
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action,
    resource,
    resourceId,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    timestamp: new Date().toISOString(),
  }
  getDb().auditLogs.unshift(entry)
  return entry
}

export function pushNotification(input: {
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, string>
}) {
  const notification: AppNotification = {
    id: createId("ntf"),
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  }
  getDb().notifications.unshift(notification)
  return notification
}

export function describeClient(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser"
  const device = /Mobile|Android|iPhone/.test(userAgent)
    ? "Mobile"
    : /Macintosh/.test(userAgent)
      ? "Mac"
      : /Windows/.test(userAgent)
        ? "Windows"
        : "Desktop"
  return { browser, device, location: "Local network" }
}
