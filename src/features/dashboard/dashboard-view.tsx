"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardSkeleton, ErrorState, PageHeader } from "@/components/data/states"
import { api } from "@/lib/api/client"
import { cacheTimes, queryKeys } from "@/lib/cache/query-keys"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth } from "@/providers/auth-provider"
import type { Priority, TaskStatus } from "@/types/domain"

type DashboardData = {
  totals: {
    projects: number
    activeProjects: number
    tasks: number
    completedTasks: number
    overdueTasks: number
    members: number
    completionPercentage: number
  }
  analytics: boolean
  completedOverTime: { date: string; count: number }[]
  byStatus: { status: TaskStatus; count: number }[]
  byPriority: { priority: Priority; count: number }[]
  workload: { userId: string; name: string; openTasks: number }[]
  projectProgress: { projectId: string; name: string; progress: number }[]
}

export function DashboardView() {
  const t = useTranslations("dashboard")
  const errors = useTranslations("errors")
  const common = useTranslations("common")
  const statuses = useTranslations("statuses")
  const priorities = useTranslations("priorities")
  const { session } = useAuth()
  const { params, setParams } = useUrlFilters()
  const range = params.get("range") ?? "30d"
  const queryString = params.toString()
  const query = useQuery({
    queryKey: queryKeys.dashboard(session.organization.id, queryString || range),
    queryFn: async () => (await api<DashboardData>(`/api/v1/dashboard?${queryString || "range=30d"}`)).data,
    staleTime: cacheTimes.dashboard,
  })

  const data = query.data
  const cards = data
    ? ([
        [t("projects"), data.totals.projects],
        [t("activeProjects"), data.totals.activeProjects],
        [t("tasks"), data.totals.tasks],
        [t("completed"), data.totals.completedTasks],
        [t("overdue"), data.totals.overdueTasks],
        [t("members"), data.totals.members],
        [t("completion"), `${data.totals.completionPercentage}%`],
      ] as const)
    : []

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {query.isLoading ? <CardSkeleton /> : null}
      {query.isError ? (
        <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => query.refetch()} />
      ) : null}
      {data ? (
        <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={common("filters")}>
        {[
          ["7d", t("last7")],
          ["30d", t("last30")],
          ["90d", t("last90")],
          ["custom", t("custom")],
        ].map(([value, label]) => (
          <Button key={value} size="sm" variant={range === value ? "default" : "outline"} onClick={() => setParams({ range: value })}>
            {label}
          </Button>
        ))}
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
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
      {data.analytics ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title={t("completedOverTime")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.completedOverTime}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("byStatus")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus.map((item) => ({ ...item, label: statuses(item.status) }))}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-2)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("byPriority")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byPriority.map((item) => ({ ...item, label: priorities(item.priority) }))}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-3)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("workload")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workload}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={50} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="openTasks" fill="var(--chart-4)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{t("progress")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.projectProgress.map((project) => (
                <div key={project.projectId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{project.name}</span>
                    <span className="text-muted-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("analyticsOff")}</p>
      )}
        </>
      ) : null}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  )
}
