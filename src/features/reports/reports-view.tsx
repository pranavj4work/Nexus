"use client"

import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { PriorityBadge, StatusBadge } from "@/components/data/badges"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/data/states"
import { EnumSelect } from "@/components/forms/enum-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api/client"
import { cacheTimes, queryKeys } from "@/lib/cache/query-keys"
import { hasPermission } from "@/lib/permissions"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth } from "@/providers/auth-provider"
import type { Priority, ProjectStatus, TaskStatus } from "@/types/domain"

type ReportData = {
  summary: {
    projects: number
    openTasks: number
    completedInPeriod: number
    createdInPeriod: number
    overdue: number
    unassigned: number
    onTimeRate: number
  }
  projectOptions: { id: string; name: string }[]
  projects: {
    projectId: string
    name: string
    status: ProjectStatus
    priority: Priority
    owner: string
    tasks: number
    completed: number
    open: number
    overdue: number
    completedInPeriod: number
    progress: number
    dueDate: string
  }[]
  tasks: {
    taskId: string
    title: string
    project: string
    status: TaskStatus
    priority: Priority
    assignee: string | null
    dueDate: string
    overdue: boolean
  }[]
  workload: {
    userId: string
    name: string
    open: number
    overdue: number
    completedInPeriod: number
    share: number
  }[]
}

function csvCell(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, rows: (string | number | boolean)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportsView() {
  const t = useTranslations("reports")
  const dashboard = useTranslations("dashboard")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const { session } = useAuth()
  const { params, setParams } = useUrlFilters()
  const allowed = hasPermission(session.permissions, "report:view") && session.features.FEATURE_ANALYTICS
  const range = params.get("range") ?? "30d"
  const queryString = params.toString()
  const query = useQuery({
    queryKey: queryKeys.reports(session.organization.id, queryString || range),
    queryFn: async () => (await api<ReportData>(`/api/v1/reports?${queryString || "range=30d"}`)).data,
    enabled: allowed,
    staleTime: cacheTimes.dashboard,
  })
  const data = query.data

  function exportReport() {
    if (!data) return
    downloadCsv("nexus-report.csv", [
      [t("projects")],
      [t("projects"), common("status"), common("owner"), t("tasksCount"), t("completedInPeriod"), t("overdue"), t("progress"), common("due")],
      ...data.projects.map((row) => [row.name, row.status, row.owner, row.tasks, row.completedInPeriod, row.overdue, `${row.progress}%`, row.dueDate]),
      [],
      [t("tasks")],
      [common("name"), t("projects"), common("status"), common("priority"), common("assignee"), common("due"), t("overdue")],
      ...data.tasks.map((row) => [row.title, row.project, row.status, row.priority, row.assignee ?? "", row.dueDate, row.overdue ? common("yes") : common("no")]),
      [],
      [t("people")],
      [common("name"), t("open"), t("overdue"), t("completedInPeriod"), t("share")],
      ...data.workload.map((row) => [row.name, row.open, row.overdue, row.completedInPeriod, `${row.share}%`]),
    ])
  }

  const stats = data
    ? [
        [t("completedInPeriod"), data.summary.completedInPeriod],
        [t("overdue"), data.summary.overdue],
        [t("unassigned"), data.summary.unassigned],
        [t("onTime"), `${data.summary.onTimeRate}%`],
      ]
    : []

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState title={t("title")} description={t("locked")} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button variant="outline" size="sm" disabled={!data} onClick={exportReport}>
            <Download />
            {t("export")}
          </Button>
        }
      />
      {query.isLoading ? <TableSkeleton /> : null}
      {query.isError ? (
        <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => query.refetch()} />
      ) : null}
      {data ? (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex flex-wrap gap-2" role="group" aria-label={common("filters")}>
              {(
                [
                  ["7d", dashboard("last7")],
                  ["30d", dashboard("last30")],
                  ["90d", dashboard("last90")],
                  ["custom", dashboard("custom")],
                ] as const
              ).map(([value, label]) => (
                <Button key={value} size="sm" variant={range === value ? "default" : "outline"} onClick={() => setParams({ range: value })}>
                  {label}
                </Button>
              ))}
            </div>
            <EnumSelect
              aria-label={t("projects")}
              value={params.get("projectId") ?? "ALL"}
              onChange={(value) => setParams({ projectId: value === "ALL" ? null : value })}
              options={[{ value: "ALL", label: t("allProjects") }, ...data.projectOptions.map((project) => ({ value: project.id, label: project.name }))]}
            />
          </div>
          {range === "custom" ? (
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-xs">
                {common("from")}
                <Input type="date" defaultValue={params.get("from") ?? ""} onChange={(event) => setParams({ range: "custom", from: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs">
                {common("to")}
                <Input type="date" defaultValue={params.get("to") ?? ""} onChange={(event) => setParams({ range: "custom", to: event.target.value })} />
              </label>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl border px-4 py-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <ReportSection title={t("projects")}>
            <ProjectTable rows={data.projects} empty={t("empty")} />
          </ReportSection>
          <ReportSection title={t("tasks")}>
            <TaskTable rows={data.tasks} empty={t("empty")} />
          </ReportSection>
          <ReportSection title={t("people")}>
            <PeopleTable rows={data.workload} empty={t("empty")} />
          </ReportSection>
        </>
      ) : null}
    </div>
  )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ProjectTable({ rows, empty }: { rows: ReportData["projects"]; empty: string }) {
  const t = useTranslations("reports")
  const common = useTranslations("common")
  if (rows.length === 0) return <EmptyState title={empty} description={empty} />
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{t("projects")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("status")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("owner")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("tasksCount")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("completedInPeriod")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("overdue")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("progress")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("due")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId} className="border-t">
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2">
                <StatusBadge value={row.status} />
              </td>
              <td className="px-3 py-2">{row.owner}</td>
              <td className="px-3 py-2 text-end">{row.tasks}</td>
              <td className="px-3 py-2 text-end">{row.completedInPeriod}</td>
              <td className={`px-3 py-2 text-end ${row.overdue > 0 ? "font-medium text-destructive" : ""}`}>{row.overdue}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${row.progress}%` }} />
                  </div>
                  <span className="text-muted-foreground">{row.progress}%</span>
                </div>
              </td>
              <td className="px-3 py-2">{row.dueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaskTable({ rows, empty }: { rows: ReportData["tasks"]; empty: string }) {
  const t = useTranslations("reports")
  const common = useTranslations("common")
  if (rows.length === 0) return <EmptyState title={empty} description={empty} />
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{common("name")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("projects")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("status")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("priority")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("assignee")}</th>
            <th className="px-3 py-2 text-start font-medium">{common("due")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("overdue")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.taskId} className="border-t">
              <td className="px-3 py-2 font-medium">{row.title}</td>
              <td className="px-3 py-2">{row.project}</td>
              <td className="px-3 py-2">
                <StatusBadge value={row.status} />
              </td>
              <td className="px-3 py-2">
                <PriorityBadge value={row.priority} />
              </td>
              <td className="px-3 py-2">{row.assignee ?? "—"}</td>
              <td className="px-3 py-2">{row.dueDate}</td>
              <td className={`px-3 py-2 ${row.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>{row.overdue ? common("yes") : common("no")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PeopleTable({ rows, empty }: { rows: ReportData["workload"]; empty: string }) {
  const t = useTranslations("reports")
  const common = useTranslations("common")
  if (rows.length === 0) return <EmptyState title={empty} description={empty} />
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{common("name")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("open")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("overdue")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("completedInPeriod")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("share")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId} className="border-t">
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 text-end">{row.open}</td>
              <td className={`px-3 py-2 text-end ${row.overdue > 0 ? "font-medium text-destructive" : ""}`}>{row.overdue}</td>
              <td className="px-3 py-2 text-end">{row.completedInPeriod}</td>
              <td className="px-3 py-2 text-end">{row.share}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
