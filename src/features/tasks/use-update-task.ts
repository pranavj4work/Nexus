"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { useAuth } from "@/providers/auth-provider"
import type { Pagination } from "@/types/domain"
import type { Priority, Task, TaskStatus } from "@/types/domain"

type TaskPage = { data: Task[]; pagination?: Pagination }
type TaskDetail = { task: Task }

export function useUpdateTask() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const errors = useTranslations("errors")
  const organizationId = session.organization.id
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<Pick<Task, "status" | "priority" | "assigneeId" | "title" | "description" | "dueDate" | "labels">> }) =>
      api<Task>(`/api/v1/tasks/${input.id}`, { method: "PATCH", body: JSON.stringify(input.patch) }).then((result) => result.data),
    onMutate: async (input) => {
      const detailKey = ["task", organizationId, input.id] as const
      await queryClient.cancelQueries({ queryKey: ["tasks", organizationId] })
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueriesData<TaskPage>({ queryKey: ["tasks", organizationId] })
      const previousDetail = queryClient.getQueriesData<TaskDetail>({ queryKey: detailKey })
      queryClient.setQueriesData<TaskPage>({ queryKey: ["tasks", organizationId] }, (current) => {
        if (!current?.data) return current
        return {
          ...current,
          data: current.data.map((task) => (task.id === input.id ? { ...task, ...input.patch } : task)),
        }
      })
      queryClient.setQueriesData<TaskDetail>({ queryKey: detailKey }, (current) => {
        if (!current?.task) return current
        return { ...current, task: { ...current.task, ...input.patch } }
      })
      return { previous, previousDetail }
    },
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
      context?.previousDetail.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(error instanceof ApiError && error.code === "RATE_LIMITED" ? errors("rateLimited") : errors("generic"))
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["task", organizationId, input.id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] })
    },
  })
}

export type { TaskStatus, Priority }
