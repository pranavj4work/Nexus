import { simulateLatency } from "@/lib/delay"
import { authorize } from "@/lib/permissions/authorize"
import { findUserById, isFeatureEnabled } from "@/repositories/access"
import { getDb } from "@/repositories/store"
import type { RequestContext, TaskStatus } from "@/types/domain"

function inRange(value: string, from: string, to: string) {
  const time = new Date(value).getTime()
  return time >= new Date(from).getTime() && time <= new Date(to).getTime()
}

export async function getDashboard(ctx: RequestContext, range: { from: string; to: string }) {
  await simulateLatency()
  authorize(ctx, "project:read")
  const db = getDb()
  const projects = db.projects.filter((project) => project.organizationId === ctx.organizationId)
  const tasks = db.tasks.filter((task) => task.organizationId === ctx.organizationId)
  const today = new Date().toISOString().slice(0, 10)
  const completed = tasks.filter((task) => task.status === "DONE")
  const overdue = tasks.filter((task) => task.status !== "DONE" && task.dueDate < today)
  const members = new Set(db.memberships.filter((item) => item.organizationId === ctx.organizationId && item.status === "ACTIVE").map((item) => item.userId))
  const ranged = tasks.filter((task) => inRange(task.updatedAt, range.from, range.to))
  const analytics = isFeatureEnabled(ctx.organizationId, "FEATURE_ANALYTICS")
  const statuses: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]
  const byStatus = statuses.map((status) => ({
    status,
    count: ranged.filter((task) => task.status === status).length,
  }))
  const byPriority = (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((priority) => ({
    priority,
    count: ranged.filter((task) => task.priority === priority).length,
  }))
  const days: { date: string; count: number }[] = []
  const cursor = new Date(range.from)
  const end = new Date(range.to)
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10)
    days.push({
      date,
      count: completed.filter((task) => task.updatedAt.slice(0, 10) === date).length,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  const workload = [...members].map((userId) => ({
    userId,
    name: findUserById(userId)?.name ?? "Unknown",
    openTasks: tasks.filter((task) => task.assigneeId === userId && task.status !== "DONE").length,
  }))
  workload.sort((left, right) => right.openTasks - left.openTasks)
  return {
    totals: {
      projects: projects.length,
      activeProjects: projects.filter((project) => project.status === "ACTIVE").length,
      tasks: tasks.length,
      completedTasks: completed.length,
      overdueTasks: overdue.length,
      members: members.size,
      completionPercentage: tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100),
    },
    analytics,
    completedOverTime: analytics ? days : [],
    byStatus: analytics ? byStatus : [],
    byPriority: analytics ? byPriority : [],
    workload: analytics ? workload.slice(0, 8) : [],
    projectProgress: analytics
      ? projects.filter((project) => project.status !== "ARCHIVED").map((project) => ({
          projectId: project.id,
          name: project.name,
          progress: project.progress,
        }))
      : [],
  }
}
