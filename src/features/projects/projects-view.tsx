"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Can } from "@/components/auth/can"
import { PriorityBadge, StatusBadge } from "@/components/data/badges"
import { PaginationBar } from "@/components/data/pagination-bar"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/data/states"
import { EnumSelect } from "@/components/forms/enum-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { fieldText } from "@/lib/ui/errors"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth, useCan } from "@/providers/auth-provider"
import { projectSchema } from "@/schemas"
import { PRIORITIES, PROJECT_STATUSES, type Project } from "@/types/domain"
import type { z } from "zod"

type FormValues = z.infer<typeof projectSchema>

export function ProjectsView() {
  const t = useTranslations("projects")
  const common = useTranslations("common")
  const statuses = useTranslations("statuses")
  const priorities = useTranslations("priorities")
  const validation = useTranslations("validation")
  const { session } = useAuth()
  const canCreate = useCan("project:create")
  const { params, setParams } = useUrlFilters()
  const [search, setSearch] = useState(params.get("search") ?? "")
  const debounced = useDebouncedValue(search)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const queryString = new URLSearchParams({
    ...Object.fromEntries(params.entries()),
    ...(debounced ? { search: debounced } : {}),
  })
  if (!debounced) queryString.delete("search")
  const list = useQuery({
    queryKey: queryKeys.projects(session.organization.id, queryString.toString()),
    queryFn: async () => api<Project[]>(`/api/v1/projects?${queryString.toString()}`),
  })

  useEffect(() => {
    const current = params.get("search") ?? ""
    if (debounced !== current) setParams({ search: debounced || null })
  }, [debounced, params, setParams])

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Can permission="project:create">
            <Button onClick={() => setOpen(true)} data-testid="create-project">
              {t("create")}
            </Button>
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
        />
        <EnumSelect
          aria-label={common("status")}
          value={params.get("status") ?? "ALL"}
          onChange={(value) => setParams({ status: value === "ALL" ? null : value })}
          options={[{ value: "ALL", label: common("all") }, ...PROJECT_STATUSES.map((status) => ({ value: status, label: statuses(status) }))]}
        />
        <EnumSelect
          aria-label={common("priority")}
          value={params.get("priority") ?? "ALL"}
          onChange={(value) => setParams({ priority: value === "ALL" ? null : value })}
          options={[{ value: "ALL", label: common("all") }, ...PRIORITIES.map((priority) => ({ value: priority, label: priorities(priority) }))]}
        />
      </div>
      {list.isLoading ? <TableSkeleton /> : null}
      {list.isError ? (
        <ErrorState title={common("retry")} description={validation("invalid")} retryLabel={common("retry")} onRetry={() => list.refetch()} />
      ) : null}
      {list.data && list.data.data.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={canCreate ? <Button onClick={() => setOpen(true)}>{t("create")}</Button> : null}
        />
      ) : null}
      {list.data && list.data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                {["name", "status", "priority", "progress", "dueDate"].map((column) => (
                  <th key={column} className="px-3 py-2 text-start font-medium">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() =>
                        setParams({
                          sort: column,
                          direction: params.get("sort") === column && params.get("direction") !== "asc" ? "asc" : "desc",
                        })
                      }
                    >
                      {column === "name" ? common("name") : column === "dueDate" ? t("due") : column === "progress" ? t("progress") : common(column === "status" ? "status" : "priority")}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((project) => (
                <tr key={project.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{project.description}</p>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={project.status} />
                  </td>
                  <td className="px-3 py-2">
                    <PriorityBadge value={project.priority} />
                  </td>
                  <td className="px-3 py-2">{project.progress}%</td>
                  <td className="px-3 py-2">{project.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <PaginationBar
        pagination={list.data?.pagination}
        onPage={(page) => setParams({ page: String(page) }, false)}
        previousLabel={common("previous")}
        nextLabel={common("next")}
        pageLabel={common("page", { page: list.data?.pagination?.page ?? 1, total: list.data?.pagination?.totalPages ?? 1 })}
      />
      <CreateProjectDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: ["projects", session.organization.id] })
          toast.success(t("created"))
        }}
      />
    </div>
  )
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const t = useTranslations("projects")
  const common = useTranslations("common")
  const validation = useTranslations("validation")
  const priorities = useTranslations("priorities")
  const form = useForm<FormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", description: "", priority: "MEDIUM", startDate: "2026-10-06", dueDate: "2026-12-31", memberIds: [] },
  })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api("/api/v1/projects", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: onCreated,
  })
  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label className="grid gap-1 text-sm">
            {common("name")}
            <Input aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            {errors.name ? <span className="text-xs text-destructive">{fieldText(validation, errors.name.message)}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            {common("description")}
            <Textarea aria-invalid={Boolean(errors.description)} {...form.register("description")} />
          </label>
          <label className="grid gap-1 text-sm">
            {common("priority")}
            <select className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...form.register("priority")}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priorities(priority)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              {t("start")}
              <Input type="date" {...form.register("startDate")} />
            </label>
            <label className="grid gap-1 text-sm">
              {t("due")}
              <Input type="date" {...form.register("dueDate")} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {common("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {common("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
