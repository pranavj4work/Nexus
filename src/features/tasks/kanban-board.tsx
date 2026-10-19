"use client"

import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states"
import { PriorityBadge } from "@/components/data/badges"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth, useCan } from "@/providers/auth-provider"
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/domain"
import { useUpdateTask } from "@/features/tasks/use-update-task"

export function KanbanBoard({ projectId }: { projectId: string }) {
  const t = useTranslations("tasks")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const statuses = useTranslations("statuses")
  const { session } = useAuth()
  const canUpdate = useCan("task:update")
  const update = useUpdateTask()
  const enabled = session.features.FEATURE_KANBAN
  const query = useQuery({
    queryKey: queryKeys.tasks(session.organization.id, { projectId, pageSize: 100 }),
    queryFn: async () => api<Task[]>(`/api/v1/tasks?projectId=${projectId}&pageSize=100`),
    enabled,
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )

  if (!enabled) return <EmptyState title={t("boardEmpty")} description={t("boardEmpty")} />
  if (query.isLoading) return <TableSkeleton />
  if (query.isError || !query.data) {
    return <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => query.refetch()} />
  }

  function onDragEnd(event: DragEndEvent) {
    if (!canUpdate) return
    const taskId = String(event.active.id)
    const overId = String(event.over?.id ?? "")
    const nextStatus = (TASK_STATUSES as readonly string[]).includes(overId)
      ? (overId as TaskStatus)
      : query.data?.data.find((task) => task.id === overId)?.status
    const current = query.data?.data.find((task) => task.id === taskId)
    if (!nextStatus || !current || current.status === nextStatus) return
    update.mutate({ id: taskId, patch: { status: nextStatus } })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" aria-label={t("title")}>
        {TASK_STATUSES.map((status) => (
          <Column key={status} status={status} title={statuses(status)} empty={t("dropColumn")}>
            {query.data.data
              .filter((task) => task.status === status)
              .map((task) => (
                <TaskCard key={task.id} task={task} draggable={canUpdate} />
              ))}
          </Column>
        ))}
      </div>
    </DndContext>
  )
}

function Column({
  status,
  title,
  empty,
  children,
}: {
  status: TaskStatus
  title: string
  empty: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section ref={setNodeRef} className={`w-64 shrink-0 rounded-xl border p-2 ${isOver ? "bg-muted" : "bg-card"}`}>
      <h2 className="px-1 py-2 text-sm font-medium">{title}</h2>
      <div className="space-y-2">
        {children}
        <p className="sr-only">{empty}</p>
      </div>
    </section>
  )
}

function TaskCard({ task, draggable }: { task: Task; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !draggable })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-background p-3 text-sm shadow-sm ${isDragging ? "opacity-70" : ""} ${draggable ? "cursor-grab" : ""}`}
      {...(draggable ? listeners : {})}
      {...attributes}
    >
      <p className="font-medium">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <PriorityBadge value={task.priority} />
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
      </div>
    </article>
  )
}
