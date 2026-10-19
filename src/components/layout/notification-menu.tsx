"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, parseISO } from "date-fns"
import { Bell } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api, ApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/providers/auth-provider"
import type { AppNotification } from "@/types/domain"

type NotificationList = { items: AppNotification[]; unread: number }

export function useNotifications() {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.notifications(session.organization.id, session.user.id),
    queryFn: async () => (await api<NotificationList>("/api/v1/notifications")).data,
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}

export function NotificationMenu() {
  const t = useTranslations("notifications")
  const errors = useTranslations("errors")
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const query = useNotifications()
  const key = queryKeys.notifications(session.organization.id, session.user.id)

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}`, { method: "PATCH" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationList>(key)
      queryClient.setQueryData<NotificationList>(key, (current) => {
        if (!current) return current
        const items = current.items.map((item) => (item.id === id ? { ...item, read: true } : item))
        return { items, unread: items.filter((item) => !item.read).length }
      })
      return { previous }
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error instanceof ApiError && error.code === "RATE_LIMITED" ? errors("rateLimited") : errors("generic"))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const unread = query.data?.unread ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={t("open")} />}>
        <Bell />
        {t("title")}
        {unread > 0 ? (
          <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">{t("title")}</p>
          <Link href="/notifications" className="text-xs text-muted-foreground hover:text-foreground">
            {t("title")}
          </Link>
        </div>
        <div className="max-h-80 overflow-auto">
          {(query.data?.items ?? []).slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full border-b px-3 py-2 text-start hover:bg-muted"
              onClick={() => markRead.mutate(item.id)}
            >
              <p className={`text-sm ${item.read ? "text-muted-foreground" : "font-medium"}`}>{item.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })}
              </p>
            </button>
          ))}
          {query.data && query.data.items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("emptyTitle")}</p>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
