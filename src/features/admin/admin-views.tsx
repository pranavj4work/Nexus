"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { PageHeader, TableSkeleton, EmptyState, ErrorState } from "@/components/data/states"
import { PaginationBar } from "@/components/data/pagination-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { useAuth, useCan } from "@/providers/auth-provider"
import type { AuditLog, FeatureFlag, Organization, Permission, PermissionDefinition, Role, SystemConfig } from "@/types/domain"

function useRolePermissions() {
  const t = useTranslations("admin")
  const errors = useTranslations("errors")
  const { session } = useAuth()
  const canUpdate = useCan("user:update")
  const queryClient = useQueryClient()
  const roles = useQuery({
    queryKey: ["roles", session.organization.id],
    queryFn: async () => (await api<Role[]>("/api/v1/roles")).data,
  })
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api<PermissionDefinition[]>("/api/v1/permissions")).data,
  })
  const update = useMutation({
    mutationFn: async (input: { id: string; permissions: Permission[] }) =>
      (await api<Role>(`/api/v1/roles/${input.id}`, { method: "PATCH", body: JSON.stringify({ permissions: input.permissions }) })).data,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["roles", session.organization.id] })
      const previous = queryClient.getQueryData<Role[]>(["roles", session.organization.id])
      queryClient.setQueryData<Role[]>(["roles", session.organization.id], (current) =>
        current?.map((role) => (role.id === input.id ? { ...role, permissions: input.permissions } : role)),
      )
      return { previous }
    },
    onSuccess: (role) => {
      queryClient.setQueryData<Role[]>(["roles", session.organization.id], (current) =>
        current?.map((item) => (item.id === role.id ? role : item)),
      )
      toast.success(t("rolesSaved"))
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(["roles", session.organization.id], context.previous)
      toast.error(errors("generic"))
    },
  })

  function toggle(role: Role, key: Permission, checked: boolean) {
    if (role.key === "SUPER_ADMIN") return
    const latest = queryClient.getQueryData<Role[]>(["roles", session.organization.id])?.find((item) => item.id === role.id) ?? role
    const next = checked ? [...new Set([...latest.permissions, key])] : latest.permissions.filter((item) => item !== key)
    update.mutate({ id: role.id, permissions: next })
  }

  return { t, canUpdate, roles, permissions, update, toggle }
}

function PermissionCheck({
  role,
  permission,
  disabled,
  onToggle,
}: {
  role: Role
  permission: Permission
  disabled: boolean
  onToggle: (role: Role, permission: Permission, checked: boolean) => void
}) {
  const locked = role.key === "SUPER_ADMIN"
  const checked = locked || role.permissions.includes(permission)
  return (
    <input
      type="checkbox"
      className="size-4 accent-primary"
      checked={checked}
      disabled={disabled || locked}
      aria-label={`${role.name} ${permission}`}
      onChange={(event) => onToggle(role, permission, event.target.checked)}
    />
  )
}

export function RolesView() {
  const { t, canUpdate, roles, permissions, update, toggle } = useRolePermissions()
  return (
    <div>
      <PageHeader title={t("rolesTitle")} description={t("rolesDescription")} />
      {roles.isLoading || permissions.isLoading ? <TableSkeleton /> : null}
      <div className="grid gap-3">
        {(roles.data ?? []).map((role) => (
          <article key={role.id} className="rounded-xl border p-4">
            <h2 className="font-medium">{role.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
            {role.key === "SUPER_ADMIN" ? <p className="mt-3 text-xs text-muted-foreground">{t("roleLocked")}</p> : null}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(permissions.data ?? []).map((permission) => (
                <li key={permission.key}>
                  <label className="flex items-start gap-2 text-sm">
                    <PermissionCheck
                      role={role}
                      permission={permission.key}
                      disabled={!canUpdate || (update.isPending && update.variables?.id === role.id)}
                      onToggle={toggle}
                    />
                    <span>
                      <span className="font-medium">{permission.key}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{permission.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

export function PermissionsView() {
  const { t, canUpdate, roles, permissions, update, toggle } = useRolePermissions()
  const roleRows = roles.data ?? []
  return (
    <div>
      <PageHeader title={t("permissionsTitle")} description={t("permissionsDescription")} />
      {roles.isLoading || permissions.isLoading ? <TableSkeleton /> : null}
      {permissions.data && roles.data ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("permissionsTitle")}</th>
                {roleRows.map((role) => (
                  <th key={role.id} className="px-3 py-2 text-center font-medium">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.data.map((permission) => (
                <tr key={permission.key} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{permission.key}</p>
                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                  </td>
                  {roleRows.map((role) => (
                    <td key={role.id} className="px-3 py-2 text-center">
                      <PermissionCheck
                        role={role}
                        permission={permission.key}
                        disabled={!canUpdate || (update.isPending && update.variables?.id === role.id)}
                        onToggle={toggle}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export function FlagsView() {
  const t = useTranslations("admin")
  const common = useTranslations("common")
  const { session } = useAuth()
  const canUpdate = useCan("feature_flag:update")
  const queryClient = useQueryClient()
  const flags = useQuery({
    queryKey: queryKeys.flags,
    queryFn: async () => (await api<FeatureFlag[]>("/api/v1/feature-flags")).data,
    staleTime: 60_000,
  })
  const orgs = session.organizations
  const update = useMutation({
    mutationFn: (flag: FeatureFlag) =>
      api(`/api/v1/feature-flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: flag.enabled, organizationIds: flag.organizationIds }),
      }),
    onSuccess: () => {
      toast.success(t("flagsSaved"))
      queryClient.invalidateQueries({ queryKey: queryKeys.flags })
      queryClient.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
  return (
    <div>
      <PageHeader title={t("flagsTitle")} description={t("flagsDescription")} />
      <div className="grid gap-3">
        {(flags.data ?? []).map((flag) => (
          <article key={flag.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">{flag.key}</h2>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
              </div>
              <Switch
                checked={flag.enabled}
                disabled={!canUpdate}
                aria-label={flag.key}
                onCheckedChange={(enabled) => update.mutate({ ...flag, enabled })}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {orgs.map((organization: Organization) => {
                const checked = flag.organizationIds.includes(organization.id)
                return (
                  <label key={organization.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canUpdate}
                      onChange={(event) => {
                        const organizationIds = event.target.checked
                          ? [...flag.organizationIds, organization.id]
                          : flag.organizationIds.filter((id) => id !== organization.id)
                        update.mutate({ ...flag, organizationIds })
                      }}
                    />
                    {organization.name}
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {common("updated")} {flag.updatedAt.slice(0, 10)}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function ConfigView() {
  const t = useTranslations("admin")
  const canUpdate = useCan("settings:update")
  const queryClient = useQueryClient()
  const config = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => (await api<SystemConfig[]>("/api/v1/configuration")).data,
    staleTime: 5 * 60_000,
  })
  const update = useMutation({
    mutationFn: (item: { key: string; value: string | number | boolean }) =>
      api(`/api/v1/configuration/${item.key}`, { method: "PATCH", body: JSON.stringify({ value: item.value }) }),
    onSuccess: () => {
      toast.success(t("configSaved"))
      queryClient.invalidateQueries({ queryKey: queryKeys.config })
    },
  })
  const groups = new Map<string, SystemConfig[]>()
  for (const item of config.data ?? []) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item])
  }
  return (
    <div>
      <PageHeader title={t("configTitle")} description={t("configDescription")} />
      {[...groups.entries()].map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-sm font-medium">{category}</h2>
          <div className="divide-y rounded-xl border">
            {items.map((item) => (
              <form
                key={item.key}
                className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_180px_auto] sm:items-center"
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  const raw = String(data.get("value"))
                  const value = item.type === "NUMBER" ? Number(raw) : item.type === "BOOLEAN" ? raw === "true" : raw
                  update.mutate({ key: item.key, value })
                }}
              >
                <div>
                  <p className="text-sm font-medium">{item.key}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.type === "BOOLEAN" ? (
                  <select name="value" defaultValue={String(item.value)} className="h-8 rounded-lg border px-2 text-sm" aria-label={item.key}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <Input name="value" aria-label={item.key} defaultValue={String(item.value)} />
                )}
                <Button type="submit" size="sm" disabled={!canUpdate || update.isPending}>
                  {t("configSaved").split(" ")[0]}
                </Button>
              </form>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function AuditView() {
  const t = useTranslations("admin")
  const common = useTranslations("common")
  const errors = useTranslations("errors")
  const { session } = useAuth()
  const { params, setParams } = useUrlFilters()
  const list = useQuery({
    queryKey: queryKeys.audit(session.organization.id, params.toString()),
    queryFn: async () => api<AuditLog[]>(`/api/v1/audit-logs?${params.toString()}`),
  })
  return (
    <div>
      <PageHeader title={t("auditTitle")} description={t("auditDescription")} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder={common("search")} aria-label={common("search")} defaultValue={params.get("search") ?? ""} onChange={(event) => setParams({ search: event.target.value || null })} />
        <Input placeholder={t("action")} aria-label={t("action")} defaultValue={params.get("action") ?? ""} onChange={(event) => setParams({ action: event.target.value || null })} />
        <Input type="date" aria-label={common("from")} defaultValue={params.get("from") ?? ""} onChange={(event) => setParams({ from: event.target.value || null })} />
        <Input type="date" aria-label={common("to")} defaultValue={params.get("to") ?? ""} onChange={(event) => setParams({ to: event.target.value || null })} />
      </div>
      {list.isLoading ? <TableSkeleton /> : null}
      {list.isError ? <ErrorState title={errors("title")} description={errors("description")} retryLabel={common("retry")} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.data.length === 0 ? <EmptyState title={t("auditEmpty")} description={t("auditDescription")} /> : null}
      {list.data && list.data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-start">{t("when")}</th>
                <th className="px-3 py-2 text-start">{t("action")}</th>
                <th className="px-3 py-2 text-start">{t("resource")}</th>
                <th className="px-3 py-2 text-start">{t("actor")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.timestamp.slice(0, 16).replace("T", " ")}</td>
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2">
                    {item.resource} · {item.resourceId}
                  </td>
                  <td className="px-3 py-2">{item.userId}</td>
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
    </div>
  )
}
