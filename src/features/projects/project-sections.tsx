"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Can } from "@/components/auth/can"
import { EnumSelect } from "@/components/forms/enum-select"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/providers/auth-provider"
import { PRIORITIES, PROJECT_STATUSES, TASK_STATUSES, type Project, type Task } from "@/types/domain"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PriorityBadge } from "@/components/data/badges"
import { CardSkeleton, ErrorState } from "@/components/data/states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProjectOverview({ projectId }: { projectId: string }) {
  const t = useTranslations("projects")
  const dashboard = useTranslations("dashboard")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const statuses = useTranslations("statuses")
  const { session } = useAuth()
  const project = useQuery({
    queryKey: queryKeys.project(session.organization.id, projectId),
    queryFn: async () => (await api<Project>(`/api/v1/projects/${projectId}`)).data,
  })
  const tasks = useQuery({
    queryKey: queryKeys.tasks(session.organization.id, { projectId, scope: "overview" }),
    queryFn: async () => api<Task[]>(`/api/v1/tasks?projectId=${projectId}&pageSize=100&sort=dueDate&direction=asc`),
  })
  const members = useQuery({
    queryKey: ["project-members", session.organization.id, projectId],
    queryFn: async () =>
      (await api<{ id: string; name: string; email: string; title: string }[]>(`/api/v1/projects/${projectId}/members`)).data,
  })
  const activity = useQuery({
    queryKey: ["project-activity", session.organization.id, projectId],
    queryFn: async () =>
      (await api<{ id: string; action: string; timestamp: string; userId: string }[]>(`/api/v1/projects/${projectId}/activity`)).data,
  })

  if (project.isLoading || tasks.isLoading) return <CardSkeleton />
  if (project.isError || tasks.isError || !project.data) {
    return (
      <ErrorState
        title={errors("title")}
        description={errors("description")}
        retryLabel={common("retry")}
        onRetry={() => {
          void project.refetch()
          void tasks.refetch()
        }}
      />
    )
  }

  const current = project.data
  const rows = tasks.data?.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  const open = rows.filter((task) => task.status !== "DONE")
  const completed = rows.filter((task) => task.status === "DONE")
  const overdue = open.filter((task) => task.dueDate < today)
  const owner = members.data?.find((member) => member.id === current.ownerId)
  const comingDue = [...open].sort((left, right) => left.dueDate.localeCompare(right.dueDate)).slice(0, 6)
  const stats = [
    [dashboard("tasks"), rows.length],
    [dashboard("openTasks"), open.length],
    [dashboard("completed"), completed.length],
    [dashboard("overdue"), overdue.length],
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("progress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {completed.length} / {rows.length}
                </span>
                <span className="text-muted-foreground">{current.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${current.progress}%` }} />
              </div>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{common("owner")}</dt>
                <dd className="font-medium">{owner?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("start")}</dt>
                <dd className="font-medium">{current.startDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("due")}</dt>
                <dd className="font-medium">{current.dueDate}</dd>
              </div>
            </dl>
            <ul className="space-y-2">
              {TASK_STATUSES.map((status) => {
                const count = rows.filter((task) => task.status === status).length
                const width = rows.length === 0 ? 0 : Math.round((count / rows.length) * 100)
                return (
                  <li key={status}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{statuses(status)}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{`${t("tasks")} · ${common("due")}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {comingDue.length === 0 ? <p className="text-sm text-muted-foreground">{common("noResults")}</p> : null}
            <ul className="divide-y">
              {comingDue.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/projects/${projectId}/tasks`} className="min-w-0 truncate font-medium hover:underline">
                    {task.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <PriorityBadge value={task.priority} />
                    <span className={task.dueDate < today ? "font-medium text-destructive" : "text-muted-foreground"}>{task.dueDate}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("members")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(members.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{common("noResults")}</p> : null}
            <ul className="divide-y">
              {(members.data ?? []).slice(0, 6).map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{member.name}</span>
                  <span className="truncate text-muted-foreground">{member.title}</span>
                </li>
              ))}
            </ul>
            {(members.data ?? []).length > 6 ? (
              <Link href={`/projects/${projectId}/members`} className="mt-2 inline-block text-sm text-muted-foreground hover:underline">
                {t("members")}
              </Link>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(activity.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{common("noResults")}</p> : null}
            <ul className="divide-y">
              {(activity.data ?? []).slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{item.action}</span>
                  <time className="shrink-0 text-muted-foreground">{item.timestamp.slice(0, 16).replace("T", " ")}</time>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ProjectSettings({ projectId }: { projectId: string }) {
  const t = useTranslations("projects")
  const common = useTranslations("common")
  const statuses = useTranslations("statuses")
  const priorities = useTranslations("priorities")
  const { session } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const project = useQuery({
    queryKey: queryKeys.project(session.organization.id, projectId),
    queryFn: async () => (await api<Project>(`/api/v1/projects/${projectId}`)).data,
  })
  const save = useMutation({
    mutationFn: (body: Partial<Project>) => api(`/api/v1/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success(t("saved"))
      queryClient.invalidateQueries({ queryKey: ["projects", session.organization.id] })
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("deleted"))
      router.push("/projects")
    },
  })
  if (!project.data) return null
  const current = project.data
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        save.mutate({
          name: String(data.get("name")),
          description: String(data.get("description")),
          startDate: String(data.get("startDate")),
          dueDate: String(data.get("dueDate")),
          status: String(data.get("status")) as Project["status"],
          priority: String(data.get("priority")) as Project["priority"],
        })
      }}
    >
      <label className="grid gap-1 text-sm">
        {common("name")}
        <Input name="name" defaultValue={current.name} />
      </label>
      <label className="grid gap-1 text-sm">
        {common("description")}
        <Textarea name="description" defaultValue={current.description} />
      </label>
      <input type="hidden" name="status" value={current.status} />
      <EnumSelect
        aria-label={common("status")}
        value={current.status}
        onChange={(value) => save.mutate({ status: value as Project["status"] })}
        options={PROJECT_STATUSES.map((status) => ({ value: status, label: statuses(status) }))}
      />
      <EnumSelect
        aria-label={common("priority")}
        value={current.priority}
        onChange={(value) => save.mutate({ priority: value as Project["priority"] })}
        options={PRIORITIES.map((priority) => ({ value: priority, label: priorities(priority) }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {t("start")}
          <Input type="date" name="startDate" defaultValue={current.startDate} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("due")}
          <Input type="date" name="dueDate" defaultValue={current.dueDate} />
        </label>
      </div>
      <div className="flex gap-2">
        <Can permission="project:update">
          <Button type="submit" disabled={save.isPending}>
            {t("save")}
          </Button>
        </Can>
        <Can permission="project:delete">
          <Button type="button" variant="destructive" onClick={() => setConfirm(true)}>
            {t("delete")}
          </Button>
        </Can>
      </div>
      <ConfirmDialog
        open={confirm}
        title={t("deleteTitle")}
        description={common("confirmDelete")}
        confirmLabel={common("delete")}
        cancelLabel={common("cancel")}
        pending={remove.isPending}
        onOpenChange={setConfirm}
        onConfirm={() => remove.mutate()}
      />
    </form>
  )
}

export function ProjectMembers({ projectId }: { projectId: string }) {
  const t = useTranslations("projects")
  const { session } = useAuth()
  const members = useQuery({
    queryKey: ["project-members", session.organization.id, projectId],
    queryFn: async () =>
      (
        await api<{ id: string; name: string; email: string; title: string }[]>(`/api/v1/projects/${projectId}/members`)
      ).data,
  })
  return (
    <ul className="divide-y rounded-xl border">
      {(members.data ?? []).map((member) => (
        <li key={member.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{member.name}</span>
            <span className="ms-2 text-muted-foreground">{member.email}</span>
          </span>
          <span className="text-muted-foreground">{member.title}</span>
        </li>
      ))}
      {members.data?.length === 0 ? <li className="px-3 py-6 text-sm text-muted-foreground">{t("members")}</li> : null}
    </ul>
  )
}

export function ProjectActivity({ projectId }: { projectId: string }) {
  const { session } = useAuth()
  const activity = useQuery({
    queryKey: ["project-activity", session.organization.id, projectId],
    queryFn: async () =>
      (
        await api<{ id: string; action: string; timestamp: string; userId: string }[]>(
          `/api/v1/projects/${projectId}/activity`,
        )
      ).data,
  })
  return (
    <ul className="divide-y rounded-xl border">
      {(activity.data ?? []).map((item) => (
        <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{item.action}</span>
          <time className="text-muted-foreground">{item.timestamp.slice(0, 16).replace("T", " ")}</time>
        </li>
      ))}
    </ul>
  )
}
