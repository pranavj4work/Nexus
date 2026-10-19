import { simulateLatency } from "@/lib/delay"
import { AppError } from "@/lib/api/errors"
import { createId } from "@/lib/ids"
import { compareValues, paginate } from "@/lib/pagination"
import { authorize } from "@/lib/permissions/authorize"
import { findUserById, getConfigBoolean, getConfigNumber, getConfigString, isFeatureEnabled } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { pushNotification, recordAudit } from "@/services/activity"
import type { Attachment, Comment, Priority, RequestContext, Task, TaskStatus } from "@/types/domain"

export type TaskListQuery = {
  page?: number
  pageSize?: number
  search?: string
  status?: TaskStatus
  priority?: Priority
  assigneeId?: string
  projectId?: string
  label?: string
  sort?: string
  direction?: "asc" | "desc"
}

function requireTask(ctx: RequestContext, taskId: string) {
  const task = getDb().tasks.find((item) => item.id === taskId && item.organizationId === ctx.organizationId)
  if (!task) throw new AppError("NOT_FOUND", "Task not found.")
  return task
}

function requireProject(ctx: RequestContext, projectId: string) {
  const project = getDb().projects.find((item) => item.id === projectId && item.organizationId === ctx.organizationId)
  if (!project) throw new AppError("NOT_FOUND", "Project not found.")
  return project
}

function syncProgress(organizationId: string, projectId: string) {
  const project = getDb().projects.find((item) => item.id === projectId && item.organizationId === organizationId)
  if (!project) return
  const tasks = getDb().tasks.filter((task) => task.projectId === projectId && task.organizationId === organizationId)
  project.progress = tasks.length === 0 ? 0 : Math.round((tasks.filter((task) => task.status === "DONE").length / tasks.length) * 100)
  project.updatedAt = new Date().toISOString()
}

export async function listTasks(ctx: RequestContext, query: TaskListQuery) {
  await simulateLatency()
  authorize(ctx, "task:read")
  const search = query.search?.trim().toLowerCase()
  let items = getDb().tasks.filter((task) => task.organizationId === ctx.organizationId)
  if (query.projectId) items = items.filter((task) => task.projectId === query.projectId)
  if (query.status) items = items.filter((task) => task.status === query.status)
  if (query.priority) items = items.filter((task) => task.priority === query.priority)
  if (query.assigneeId) items = items.filter((task) => task.assigneeId === query.assigneeId)
  if (query.label) items = items.filter((task) => task.labels.includes(query.label as string))
  if (search) items = items.filter((task) => `${task.title} ${task.description} ${task.labels.join(" ")}`.toLowerCase().includes(search))
  const sort = query.sort ?? "updatedAt"
  const direction = query.direction === "asc" ? 1 : -1
  items.sort((left, right) => {
    const value = (task: Task) => {
      if (sort === "title") return task.title
      if (sort === "status") return task.status
      if (sort === "priority") return task.priority
      if (sort === "dueDate") return task.dueDate
      return task.updatedAt
    }
    return compareValues(value(left), value(right)) * direction
  })
  return paginate(items, query.page, query.pageSize ?? (query.projectId && !query.pageSize ? 100 : 20))
}

export async function getTask(ctx: RequestContext, taskId: string) {
  await simulateLatency()
  authorize(ctx, "task:read")
  const task = requireTask(ctx, taskId)
  const comments = getDb().comments.filter((comment) => comment.taskId === task.id && comment.organizationId === ctx.organizationId)
  const attachments = getDb().attachments.filter((item) => item.taskId === task.id && item.organizationId === ctx.organizationId)
  return { task, comments, attachments }
}

export async function createTask(
  ctx: RequestContext,
  input: {
    projectId: string
    title: string
    description: string
    status?: TaskStatus
    priority?: Priority
    assigneeId?: string | null
    dueDate: string
    labels?: string[]
  },
) {
  await simulateLatency()
  authorize(ctx, "task:create")
  requireProject(ctx, input.projectId)
  const labels = input.labels ?? []
  if (labels.length > getConfigNumber("TASKS_MAX_LABELS")) {
    throw new AppError("VALIDATION", "validation.invalid", { labels: "validation.labels" })
  }
  if (input.assigneeId && !getConfigBoolean("TASKS_ALLOW_ASSIGNMENT")) {
    throw new AppError("FORBIDDEN", "Task assignment is disabled.")
  }
  if (input.assigneeId) authorize(ctx, "task:assign")
  const now = new Date().toISOString()
  const task: Task = {
    id: createId("task"),
    organizationId: ctx.organizationId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    status: input.status ?? "BACKLOG",
    priority: input.priority ?? (getConfigString("TASKS_DEFAULT_PRIORITY") as Priority),
    assigneeId: input.assigneeId ?? null,
    reporterId: ctx.user.id,
    labels,
    dueDate: input.dueDate,
    createdAt: now,
    updatedAt: now,
  }
  getDb().tasks.unshift(task)
  syncProgress(ctx.organizationId, task.projectId)
  recordAudit(ctx, "TASK_CREATED", "TASK", task.id, { title: task.title })
  if (task.assigneeId && task.assigneeId !== ctx.user.id) {
    recordAudit(ctx, "TASK_ASSIGNED", "TASK", task.id, { assigneeId: task.assigneeId })
    pushNotification({
      organizationId: ctx.organizationId,
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: "Task assigned to you",
      message: `You have been assigned “${task.title}”.`,
      metadata: { taskId: task.id, projectId: task.projectId },
    })
  }
  return task
}

export async function updateTask(
  ctx: RequestContext,
  taskId: string,
  input: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "assigneeId" | "dueDate" | "labels">>,
) {
  await simulateLatency()
  authorize(ctx, "task:update")
  const task = requireTask(ctx, taskId)
  if (input.labels && input.labels.length > getConfigNumber("TASKS_MAX_LABELS")) {
    throw new AppError("VALIDATION", "validation.invalid", { labels: "validation.labels" })
  }
  if (input.assigneeId && input.assigneeId !== task.assigneeId) {
    if (!getConfigBoolean("TASKS_ALLOW_ASSIGNMENT")) throw new AppError("FORBIDDEN", "Task assignment is disabled.")
    authorize(ctx, "task:assign")
  }
  const previousStatus = task.status
  const previousAssignee = task.assigneeId
  const previousPriority = task.priority
  Object.assign(task, input, { updatedAt: new Date().toISOString() })
  if (input.status && input.status !== previousStatus) {
    recordAudit(ctx, "TASK_STATUS_CHANGED", "TASK", task.id, { oldStatus: previousStatus, newStatus: input.status })
    syncProgress(ctx.organizationId, task.projectId)
  }
  if (input.assigneeId && input.assigneeId !== previousAssignee) {
    recordAudit(ctx, "TASK_ASSIGNED", "TASK", task.id, { assigneeId: input.assigneeId })
    if (input.assigneeId !== ctx.user.id) {
      pushNotification({
        organizationId: ctx.organizationId,
        userId: input.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        message: `You have been assigned “${task.title}”.`,
        metadata: { taskId: task.id, projectId: task.projectId },
      })
    }
  }
  if (input.priority && input.priority !== previousPriority) {
    recordAudit(ctx, "TASK_STATUS_CHANGED", "TASK", task.id, { oldPriority: previousPriority, newPriority: input.priority })
  }
  return task
}

export async function deleteTask(ctx: RequestContext, taskId: string) {
  await simulateLatency()
  authorize(ctx, "task:delete")
  const task = requireTask(ctx, taskId)
  const db = getDb()
  db.tasks = db.tasks.filter((item) => item.id !== taskId)
  db.comments = db.comments.filter((comment) => comment.taskId !== taskId)
  db.attachments = db.attachments.filter((item) => item.taskId !== taskId)
  syncProgress(ctx.organizationId, task.projectId)
}

export async function addComment(ctx: RequestContext, taskId: string, body: string) {
  await simulateLatency()
  authorize(ctx, "task:update")
  const task = requireTask(ctx, taskId)
  const comment: Comment = {
    id: createId("cmt"),
    organizationId: ctx.organizationId,
    taskId,
    authorId: ctx.user.id,
    body,
    createdAt: new Date().toISOString(),
  }
  getDb().comments.unshift(comment)
  const members = getDb().users.filter((user) => body.toLowerCase().includes(`@${user.name.toLowerCase()}`))
  for (const member of members) {
    if (member.id === ctx.user.id) continue
    if (!getDb().memberships.some((item) => item.userId === member.id && item.organizationId === ctx.organizationId)) continue
    pushNotification({
      organizationId: ctx.organizationId,
      userId: member.id,
      type: "TASK_MENTIONED",
      title: "You were mentioned",
      message: `${ctx.user.name} mentioned you on “${task.title}”.`,
      metadata: { taskId: task.id, projectId: task.projectId },
    })
  }
  if (task.assigneeId && task.assigneeId !== ctx.user.id) {
    pushNotification({
      organizationId: ctx.organizationId,
      userId: task.assigneeId,
      type: "TASK_COMMENTED",
      title: "New comment on a task",
      message: `${ctx.user.name} commented on “${task.title}”.`,
      metadata: { taskId: task.id, projectId: task.projectId },
    })
  }
  return comment
}

export async function addAttachment(ctx: RequestContext, taskId: string, input: { fileName: string; sizeBytes: number }) {
  await simulateLatency()
  authorize(ctx, "task:update")
  requireTask(ctx, taskId)
  if (!getConfigBoolean("TASKS_ALLOW_ATTACHMENTS") || !isFeatureEnabled(ctx.organizationId, "FEATURE_FILE_ATTACHMENTS")) {
    throw new AppError("FORBIDDEN", "Attachments are not enabled.")
  }
  const attachment: Attachment = {
    id: createId("att"),
    organizationId: ctx.organizationId,
    taskId,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    createdBy: ctx.user.id,
    createdAt: new Date().toISOString(),
  }
  getDb().attachments.unshift(attachment)
  return attachment
}

export function userName(userId: string | null) {
  if (!userId) return null
  return findUserById(userId)?.name ?? null
}
