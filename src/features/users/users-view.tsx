"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Can } from "@/components/auth/can"
import { StatusBadge } from "@/components/data/badges"
import { PaginationBar } from "@/components/data/pagination-bar"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/data/states"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { EnumSelect } from "@/components/forms/enum-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth } from "@/providers/auth-provider"
import type { Role, UserStatus } from "@/types/domain"

type Member = {
  id: string
  name: string
  email: string
  title: string
  status: UserStatus
  roleIds: string[]
}

export function UsersView() {
  const t = useTranslations("users")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const { session } = useAuth()
  const { params, setParams } = useUrlFilters()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const roles = useQuery({
    queryKey: ["roles", session.organization.id],
    queryFn: async () => (await api<Role[]>("/api/v1/roles")).data,
  })
  const list = useQuery({
    queryKey: queryKeys.users(session.organization.id, params.toString()),
    queryFn: async () => api<Member[]>(`/api/v1/users?${params.toString()}`),
  })
  const update = useMutation({
    mutationFn: (input: { id: string; body: Record<string, string> }) =>
      api(`/api/v1/users/${input.id}`, { method: "PATCH", body: JSON.stringify(input.body) }),
    onSuccess: () => {
      toast.success(t("updated"))
      queryClient.invalidateQueries({ queryKey: ["users", session.organization.id] })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("removed"))
      setRemoveId(null)
      queryClient.invalidateQueries({ queryKey: ["users", session.organization.id] })
    },
  })

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Can permission="user:invite">
            <Button onClick={() => setInviteOpen(true)}>{t("invite")}</Button>
          </Can>
        }
      />
      <Input
        className="mb-4 max-w-sm"
        defaultValue={params.get("search") ?? ""}
        placeholder={t("search")}
        aria-label={t("search")}
        onChange={(event) => setParams({ search: event.target.value || null })}
      />
      {list.isLoading ? <TableSkeleton /> : null}
      {list.isError ? <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.data.length === 0 ? <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /> : null}
      {list.data && list.data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-start">{common("name")}</th>
                <th className="px-3 py-2 text-start">{common("role")}</th>
                <th className="px-3 py-2 text-start">{common("status")}</th>
                <th className="px-3 py-2 text-start">{common("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <EnumSelect
                      aria-label={common("role")}
                      value={member.roleIds[0] ?? ""}
                      onChange={(roleId) => update.mutate({ id: member.id, body: { roleId } })}
                      options={(roles.data ?? [])
                        .filter((role) => role.key !== "SUPER_ADMIN")
                        .map((role) => ({ value: role.id, label: role.name }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={member.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Can permission="user:update">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            update.mutate({
                              id: member.id,
                              body: { status: member.status === "DISABLED" ? "ACTIVE" : "DISABLED" },
                            })
                          }
                        >
                          {member.status === "DISABLED" ? t("activate") : t("disable")}
                        </Button>
                      </Can>
                      <Can permission="user:remove">
                        <Button size="sm" variant="ghost" onClick={() => setRemoveId(member.id)}>
                          {common("remove")}
                        </Button>
                      </Can>
                    </div>
                  </td>
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
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={roles.data ?? []} />
      <ConfirmDialog
        open={Boolean(removeId)}
        title={t("removeTitle")}
        description={common("confirmDelete")}
        confirmLabel={common("remove")}
        cancelLabel={common("cancel")}
        onOpenChange={(open) => !open && setRemoveId(null)}
        onConfirm={() => removeId && remove.mutate(removeId)}
      />
    </div>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: Role[]
}) {
  const t = useTranslations("users")
  const common = useTranslations("common")
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [roleId, setRoleId] = useState("role_developer")
  const mutation = useMutation({
    mutationFn: (body: { name: string; email: string; roleId: string }) =>
      api("/api/v1/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success(t("invited"))
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["users", session.organization.id] })
    },
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("invite")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            mutation.mutate({ name: String(data.get("name")), email: String(data.get("email")), roleId })
          }}
        >
          <Input name="name" placeholder={common("name")} aria-label={common("name")} required />
          <Input name="email" type="email" placeholder={common("email")} aria-label={common("email")} required />
          <EnumSelect
            aria-label={common("role")}
            value={roleId}
            onChange={setRoleId}
            options={roles.filter((role) => role.key !== "SUPER_ADMIN").map((role) => ({ value: role.id, label: role.name }))}
          />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {common("invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
