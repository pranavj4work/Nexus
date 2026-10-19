import { AppError } from "@/lib/api/errors"
import { simulateLatency } from "@/lib/delay"
import { authorize } from "@/lib/permissions/authorize"
import { findUserById, isFeatureEnabled } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import type { RequestContext } from "@/types/domain"

function inRange(value: string, from: string, to: string) {
  const time = new Date(value).getTime()
  return time >= new Date(from).getTime() && time <= new Date(to).getTime()
}

function personName(userId: string | null) {
  if (!userId) return null
  return findUserById(userId)?.name ?? null
}

export async function getReport(ctx: RequestContext, filters: { from: string; to: string; projectId?: string | null }) {
  await simulateLatency()
  authorize(ctx, "report:view")
  if (!isFeatureEnabled(ctx.organizationId, "FEATURE_ANALYTICS")) {
    throw new AppError("FORBIDDEN", "Analytics is turned off for this organization.")
  }

  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const orgProjects = db.projects.filter((project) => project.organizationId === ctx.organizationId)
  if (filters.projectId && !orgProjects.some((project) => project.id === filters.projectId)) {
    throw new AppError("NOT_FOUND", "We could not find that project.")
  }

  const visibleProjects = orgProjects.filter((project) => project.status !== "ARCHIVED")
  const selected = filters.projectId ? visibleProjects.filter((project) => project.id === filters.projectId) : visibleProjects
  const projectIds = new Set(selected.map((project) => project.id))
  const tasks = db.tasks.filter((task) => task.organizationId === ctx.organizationId && projectIds.has(task.projectId))
  const open = tasks.filter((task) => task.status !== "DONE")
  const completedInPeriod = tasks.filter((task) => task.status === "DONE" && inRange(task.updatedAt, filters.from, filters.to))
  const onTime = completedInPeriod.filter((task) => task.updatedAt.slice(0, 10) <= task.dueDate)

  const projects = selected
    .map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id)
      const projectOpen = projectTasks.filter((task) => task.status !== "DONE")
      return {
        projectId: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        owner: personName(project.ownerId) ?? "Unknown",
        tasks: projectTasks.length,
        completed: projectTasks.filter((task) => task.status === "DONE").length,
        open: projectOpen.length,
        overdue: projectOpen.filter((task) => task.dueDate < today).length,
        completedInPeriod: projectTasks.filter((task) => task.status === "DONE" && inRange(task.updatedAt, filters.from, filters.to)).length,
        progress: project.progress,
        dueDate: project.dueDate,
      }
    })
    .sort((left, right) => right.overdue - left.overdue || left.name.localeCompare(right.name))

  const taskRows = tasks
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      project: selected.find((project) => project.id === task.projectId)?.name ?? "",
      status: task.status,
      priority: task.priority,
      assignee: personName(task.assigneeId),
      dueDate: task.dueDate,
      overdue: task.status !== "DONE" && task.dueDate < today,
    }))
    .sort((left, right) => Number(right.overdue) - Number(left.overdue) || left.dueDate.localeCompare(right.dueDate))

  const memberIds = [
    ...new Set(
      db.memberships
        .filter((item) => item.organizationId === ctx.organizationId && item.status === "ACTIVE")
        .map((item) => item.userId),
    ),
  ]
  const workload = memberIds
    .map((userId) => {
      const assigned = tasks.filter((task) => task.assigneeId === userId)
      const assignedOpen = assigned.filter((task) => task.status !== "DONE")
      return {
        userId,
        name: personName(userId) ?? "Unknown",
        open: assignedOpen.length,
        overdue: assignedOpen.filter((task) => task.dueDate < today).length,
        completedInPeriod: assigned.filter((task) => task.status === "DONE" && inRange(task.updatedAt, filters.from, filters.to)).length,
      }
    })
    .sort((left, right) => right.open - left.open || left.name.localeCompare(right.name))
  const openTotal = workload.reduce((sum, row) => sum + row.open, 0)

  return {
    summary: {
      projects: selected.length,
      openTasks: open.length,
      completedInPeriod: completedInPeriod.length,
      createdInPeriod: tasks.filter((task) => inRange(task.createdAt, filters.from, filters.to)).length,
      overdue: open.filter((task) => task.dueDate < today).length,
      unassigned: open.filter((task) => !task.assigneeId).length,
      onTimeRate: completedInPeriod.length === 0 ? 0 : Math.round((onTime.length / completedInPeriod.length) * 100),
    },
    projectOptions: visibleProjects.map((project) => ({ id: project.id, name: project.name })).sort((left, right) => left.name.localeCompare(right.name)),
    projects,
    tasks: taskRows,
    workload: workload.map((row) => ({
      ...row,
      share: openTotal === 0 ? 0 : Math.round((row.open / openTotal) * 100),
    })),
  }
}
