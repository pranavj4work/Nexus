import { simulateLatency } from "@/lib/delay"
import { AppError } from "@/lib/api/errors"
import { createId } from "@/lib/ids"
import { compareValues, paginate } from "@/lib/pagination"
import { authorize } from "@/lib/permissions/authorize"
import { findMembership, findUserById, getConfigBoolean, getConfigNumber, getConfigString } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import { recordAudit } from "@/services/activity"
import type { Priority, Project, ProjectStatus, RequestContext } from "@/types/domain"

export type ProjectListQuery = {
  page?: number
  pageSize?: number
  search?: string
  status?: ProjectStatus
  priority?: Priority
  sort?: string
  direction?: "asc" | "desc"
}

function requireProject(ctx: RequestContext, projectId: string) {
  const project = getDb().projects.find((item) => item.id === projectId && item.organizationId === ctx.organizationId)
  if (!project) throw new AppError("NOT_FOUND", "Project not found.")
  return project
}

function assertMembers(ctx: RequestContext, memberIds: string[]) {
  for (const userId of memberIds) {
    const membership = findMembership(userId, ctx.organizationId)
    if (!membership || membership.status !== "ACTIVE") {
      throw new AppError("VALIDATION", "validation.invalid", { memberIds: "validation.member" })
    }
  }
}

export async function listProjects(ctx: RequestContext, query: ProjectListQuery) {
  await simulateLatency()
  authorize(ctx, "project:read")
  const search = query.search?.trim().toLowerCase()
  let items = getDb().projects.filter((project) => project.organizationId === ctx.organizationId)
  if (query.status) items = items.filter((project) => project.status === query.status)
  if (query.priority) items = items.filter((project) => project.priority === query.priority)
  if (search) {
    items = items.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(search))
  }
  const sort = query.sort ?? "updatedAt"
  const direction = query.direction === "asc" ? 1 : -1
  items.sort((left, right) => {
    const map: Record<string, string | number> = {
      name: left.name,
      status: left.status,
      priority: left.priority,
      dueDate: left.dueDate,
      progress: left.progress,
      updatedAt: left.updatedAt,
    }
    const rightMap: Record<string, string | number> = {
      name: right.name,
      status: right.status,
      priority: right.priority,
      dueDate: right.dueDate,
      progress: right.progress,
      updatedAt: right.updatedAt,
    }
    return compareValues(map[sort] ?? left.updatedAt, rightMap[sort] ?? right.updatedAt) * direction
  })
  return paginate(items, query.page, query.pageSize)
}

export async function getProject(ctx: RequestContext, projectId: string) {
  await simulateLatency()
  authorize(ctx, "project:read")
  return requireProject(ctx, projectId)
}

export async function createProject(
  ctx: RequestContext,
  input: {
    name: string
    description: string
    status?: ProjectStatus
    priority: Priority
    startDate: string
    dueDate: string
    memberIds?: string[]
  },
) {
  await simulateLatency()
  authorize(ctx, "project:create")
  if (!getConfigBoolean("PROJECTS_ALLOW_CREATION")) {
    throw new AppError("FORBIDDEN", "Project creation is disabled.")
  }
  const existing = getDb().projects.filter((project) => project.organizationId === ctx.organizationId)
  if (existing.length >= getConfigNumber("PROJECTS_MAX")) {
    throw new AppError("CONFLICT", "This organization has reached the project limit.")
  }
  if (input.dueDate < input.startDate) {
    throw new AppError("VALIDATION", "validation.invalid", { dueDate: "validation.dueDate" })
  }
  const memberIds = [...new Set([ctx.user.id, ...(input.memberIds ?? [])])]
  assertMembers(ctx, memberIds)
  const now = new Date().toISOString()
  const project: Project = {
    id: createId("prj"),
    organizationId: ctx.organizationId,
    name: input.name,
    description: input.description,
    status: input.status ?? (getConfigString("PROJECTS_DEFAULT_STATUS") as ProjectStatus),
    priority: input.priority,
    ownerId: ctx.user.id,
    progress: 0,
    startDate: input.startDate,
    dueDate: input.dueDate,
    memberIds,
    createdAt: now,
    updatedAt: now,
  }
  getDb().projects.unshift(project)
  recordAudit(ctx, "PROJECT_CREATED", "PROJECT", project.id, { name: project.name })
  return project
}

export async function updateProject(ctx: RequestContext, projectId: string, input: Partial<Omit<Project, "id" | "organizationId" | "createdAt">>) {
  await simulateLatency()
  authorize(ctx, "project:update")
  const project = requireProject(ctx, projectId)
  if (input.memberIds) assertMembers(ctx, input.memberIds)
  if (input.status === "ARCHIVED" && !getConfigBoolean("PROJECTS_ALLOW_ARCHIVE")) {
    throw new AppError("FORBIDDEN", "Archiving projects is disabled.")
  }
  Object.assign(project, input, { updatedAt: new Date().toISOString() })
  recordAudit(ctx, "PROJECT_UPDATED", "PROJECT", project.id, { name: project.name })
  return project
}

export async function deleteProject(ctx: RequestContext, projectId: string) {
  await simulateLatency()
  authorize(ctx, "project:delete")
  const project = requireProject(ctx, projectId)
  const db = getDb()
  const taskIds = new Set(db.tasks.filter((task) => task.projectId === projectId).map((task) => task.id))
  db.projects = db.projects.filter((item) => item.id !== projectId)
  db.tasks = db.tasks.filter((task) => task.projectId !== projectId)
  db.comments = db.comments.filter((comment) => !taskIds.has(comment.taskId))
  db.attachments = db.attachments.filter((attachment) => !taskIds.has(attachment.taskId))
  recordAudit(ctx, "PROJECT_DELETED", "PROJECT", projectId, { name: project.name })
}

export async function listProjectMembers(ctx: RequestContext, projectId: string) {
  const project = await getProject(ctx, projectId)
  return project.memberIds
    .map((userId) => findUserById(userId))
    .filter((user) => user !== null)
    .map((user) => {
      const membership = findMembership(user.id, ctx.organizationId)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        initials: user.initials,
        roleIds: membership?.roleIds ?? [],
      }
    })
}

export async function addProjectMember(ctx: RequestContext, projectId: string, userId: string) {
  const project = await getProject(ctx, projectId)
  authorize(ctx, "project:update")
  assertMembers(ctx, [userId])
  if (!project.memberIds.includes(userId)) project.memberIds.push(userId)
  project.updatedAt = new Date().toISOString()
  recordAudit(ctx, "PROJECT_UPDATED", "PROJECT", project.id, { memberId: userId })
  return project
}

export async function removeProjectMember(ctx: RequestContext, projectId: string, userId: string) {
  const project = await getProject(ctx, projectId)
  authorize(ctx, "project:update")
  if (userId === project.ownerId) throw new AppError("CONFLICT", "The project owner cannot be removed.")
  project.memberIds = project.memberIds.filter((id) => id !== userId)
  project.updatedAt = new Date().toISOString()
  recordAudit(ctx, "PROJECT_UPDATED", "PROJECT", project.id, { removedMemberId: userId })
  return project
}
