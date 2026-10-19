"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/data/states"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/providers/auth-provider"
import { useNotifications } from "@/components/layout/notification-menu"

export default function NotificationsPage() {
  const t = useTranslations("notifications")
  const errors = useTranslations("errors")
  const common = useTranslations("common")
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const query = useNotifications()
  const markAll = useMutation({
    mutationFn: () => api("/api/v1/notifications", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(session.organization.id, session.user.id) }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(session.organization.id, session.user.id) }),
  })
  if (!session.features.FEATURE_NOTIFICATIONS) {
    return <EmptyState title={t("disabled")} description={t("disabled")} />
  }
  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button variant="outline" onClick={() => markAll.mutate()}>
            {t("markAll")}
          </Button>
        }
      />
      {query.isLoading ? <TableSkeleton /> : null}
      {query.isError ? <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => query.refetch()} /> : null}
      {query.data && query.data.items.length === 0 ? <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /> : null}
      <ul className="divide-y rounded-xl border">
        {query.data?.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-3">
            <div>
              <p className={item.read ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.message}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(item.id)}>
              {common("delete")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
