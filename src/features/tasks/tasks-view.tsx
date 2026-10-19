"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { z } from "zod"
import { Can } from "@/components/auth/can"
import { PriorityBadge, StatusBadge } from "@/components/data/badges"
import { PaginationBar } from "@/components/data/pagination-bar"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/data/states"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { EnumSelect } from "@/components/forms/enum-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { fieldText } from "@/lib/ui/errors"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth, useCan } from "@/providers/auth-provider"
import { taskSchema } from "@/schemas"
import { PRIORITIES, TASK_STATUSES, type Comment, type Project, type Task, type Attachment } from "@/types/domain"
import { useUpdateTask } from "@/features/tasks/use-update-task"

type FormValues = z.infer<typeof taskSchema>
type TaskDetail = { task: Task; comments: Comment[]; attachments: Attachment[] }

export function TasksView({ projectId }: { projectId?: string }) {
  const t = useTranslations("tasks")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const statuses = useTranslations("statuses")
  const priorities = useTranslations("priorities")
  const { session } = useAuth()
  const canCreate = useCan("task:create")
  const { params, setParams } = useUrlFilters()
  const [search, setSearch] = useState(params.get("search") ?? "")
  const debounced = useDebouncedValue(search)
  const [open, setOpen] = useState(false)
  const selected = params.get("task")
  const query = new URLSearchParams(params.toString())
  if (projectId) query.set("projectId", projectId)
  if (debounced) query.set("search", debounced)
  else query.delete("search")
  const list = useQuery({
    queryKey: queryKeys.tasks(session.organization.id, query.toString()),
    queryFn: async () => api<Task[]>(`/api/v1/tasks?${query.toString()}`),
  })

  return (
    <div>
      {!projectId ? (
        <PageHeader
          title={t("title")}
          description={t("description")}
          action={
            <Can permission="task:create">
              <Button data-testid="create-task" onClick={() => setOpen(true)}>
                {t("create")}
              </Button>
            </Can>
          }
        />
      ) : canCreate ? (
        <div className="mb-4 flex justify-end">
          <Button data-testid="create-task" onClick={() => setOpen(true)}>
            {t("create")}
          </Button>
        </div>
      ) : null}
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setParams({ search: event.target.value || null })
          }}
          placeholder={t("search")}
          aria-label={t("search")}
        />
        <EnumSelect
          aria-label={common("status")}
          value={params.get("status") ?? "ALL"}
          onChange={(value) => setParams({ status: value === "ALL" ? null : value })}
          options={[{ value: "ALL", label: common("all") }, ...TASK_STATUSES.map((status) => ({ value: status, label: statuses(status) }))]}
        />
        <EnumSelect
          aria-label={common("priority")}
          value={params.get("priority") ?? "ALL"}
          onChange={(value) => setParams({ priority: value === "ALL" ? null : value })}
          options={[{ value: "ALL", label: common("all") }, ...PRIORITIES.map((priority) => ({ value: priority, label: priorities(priority) }))]}
        />
      </div>
      {list.isLoading ? <TableSkeleton /> : null}
      {list.isError ? <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.data.length === 0 ? <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /> : null}
      {list.data && list.data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-start">
                  <button type="button" onClick={() => setParams({ sort: "title", direction: params.get("direction") === "asc" ? "desc" : "asc" })}>
                    {t("titleLabel")}
                  </button>
                </th>
                <th className="px-3 py-2 text-start">{common("status")}</th>
                <th className="px-3 py-2 text-start">{common("priority")}</th>
                <th className="px-3 py-2 text-start">{common("due")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((task) => (
                <tr key={task.id} className="border-t">
                  <td className="px-3 py-2">
                    <button type="button" className="text-start font-medium hover:underline" onClick={() => setParams({ task: task.id }, false)}>
                      {task.title}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={task.status} />
                  </td>
                  <td className="px-3 py-2">
                    <PriorityBadge value={task.priority} />
                  </td>
                  <td className="px-3 py-2">{task.dueDate}</td>
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
      <CreateTaskDialog open={open} onOpenChange={setOpen} projectId={projectId} />
      <TaskSheet taskId={selected} onClose={() => setParams({ task: null }, false)} />
    </div>
  )
}

function CreateTaskDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId?: string }) {
  const t = useTranslations("tasks")
  const common = useTranslations("common")
  const validation = useTranslations("validation")
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const projects = useQuery({
    queryKey: queryKeys.projects(session.organization.id, "options"),
    queryFn: async () => (await api<Project[]>("/api/v1/projects?pageSize=100")).data,
    enabled: open,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: projectId ?? "",
      title: "",
      description: "",
      priority: "MEDIUM",
      dueDate: "2026-10-20",
      labels: [],
    },
  })
  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({ ...values, labels: values.labels ?? [], projectId: projectId || values.projectId }),
      }),
    onSuccess: () => {
      toast.success(t("created"))
      onOpenChange(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ["tasks", session.organization.id] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {!projectId ? (
            <label className="grid gap-1 text-sm">
              {t("project")}
              <select className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...form.register("projectId")}>
                <option value="">{t("project")}</option>
                {(projects.data ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm">
            {t("titleLabel")}
            <Input {...form.register("title")} aria-invalid={Boolean(form.formState.errors.title)} />
            {form.formState.errors.title ? <span className="text-xs text-destructive">{fieldText(validation, form.formState.errors.title.message)}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            {common("description")}
            <Textarea {...form.register("description")} />
          </label>
          <label className="grid gap-1 text-sm">
            {common("due")}
            <Input type="date" {...form.register("dueDate")} />
          </label>
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

function TaskSheet({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const t = useTranslations("tasks")
  const common = useTranslations("common")
  const statuses = useTranslations("statuses")
  const priorities = useTranslations("priorities")
  const { session } = useAuth()
  const update = useUpdateTask()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const [comment, setComment] = useState("")
  const detail = useQuery({
    queryKey: queryKeys.task(session.organization.id, taskId ?? "none"),
    queryFn: async () => (await api<TaskDetail>(`/api/v1/tasks/${taskId}`)).data,
    enabled: Boolean(taskId),
  })
  const commentMutation = useMutation({
    mutationFn: () => api(`/api/v1/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) }),
    onSuccess: () => {
      setComment("")
      queryClient.invalidateQueries({ queryKey: queryKeys.task(session.organization.id, taskId ?? "") })
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("deleted"))
      queryClient.invalidateQueries({ queryKey: ["tasks", session.organization.id] })
      onClose()
    },
  })
  const task = detail.data?.task
  const side = "right"

  return (
    <Sheet open={Boolean(taskId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={side} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{task?.title ?? t("title")}</SheetTitle>
        </SheetHeader>
        {task ? (
          <div className="grid gap-4 px-4 pb-6">
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <EnumSelect
              aria-label={common("status")}
              value={task.status}
              onChange={(value) => update.mutate({ id: task.id, patch: { status: value as Task["status"] } })}
              options={TASK_STATUSES.map((status) => ({ value: status, label: statuses(status) }))}
            />
            <EnumSelect
              aria-label={common("priority")}
              value={task.priority}
              onChange={(value) => update.mutate({ id: task.id, patch: { priority: value as Task["priority"] } })}
              options={PRIORITIES.map((priority) => ({ value: priority, label: priorities(priority) }))}
            />
            <div>
              <h3 className="mb-2 text-sm font-medium">{t("comments")}</h3>
              <div className="space-y-2">
                {detail.data?.comments.map((item) => (
                  <p key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                    {item.body}
                  </p>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("comment")} aria-label={t("comment")} />
                <Button type="button" disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                  {t("addComment")}
                </Button>
              </div>
            </div>
            {session.features.FEATURE_FILE_ATTACHMENTS ? (
              <div>
                <h3 className="mb-2 text-sm font-medium">{t("attachments")}</h3>
                {detail.data?.attachments.map((file) => (
                  <p key={file.id} className="text-sm text-muted-foreground">
                    {file.fileName}
                  </p>
                ))}
                <Can permission="task:update">
                  <Button
                    className="mt-2"
                    variant="outline"
                    onClick={() =>
                      api(`/api/v1/tasks/${task.id}/attachments`, {
                        method: "POST",
                        body: JSON.stringify({ fileName: "notes.txt", sizeBytes: 1200 }),
                      }).then(() => detail.refetch())
                    }
                  >
                    {t("addAttachment")}
                  </Button>
                </Can>
              </div>
            ) : null}
            <Can permission="task:delete">
              <Button variant="destructive" onClick={() => setConfirm(true)}>
                {common("delete")}
              </Button>
            </Can>
          </div>
        ) : null}
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
      </SheetContent>
    </Sheet>
  )
}
