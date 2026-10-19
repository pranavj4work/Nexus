"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { PageHeader, EmptyState } from "@/components/data/states"
import { EnumSelect } from "@/components/forms/enum-select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api/client"
import { loadPage } from "@/lib/load-page"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/providers/auth-provider"
import { LOCALES, THEME_MODES, type Locale, type ThemeMode } from "@/types/domain"
import { useTheme } from "next-themes"

type SessionRow = {
  id: string
  browser: string
  device: string
  location: string
  ipAddress: string
  lastActiveAt: string
  current: boolean
}

export function SettingsView() {
  const t = useTranslations("settings")
  const common = useTranslations("common")
  const theme = useTranslations("theme")
  const { session, updateSessionUser } = useAuth()
  const { setTheme } = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (body: Record<string, string | boolean>) => api("/api/v1/preferences", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, variables) => {
      toast.success(t("saved"))
      if (typeof variables.locale === "string") {
        window.location.reload()
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.session })
      router.refresh()
    },
  })
  return (
    <div className="grid max-w-xl gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <section className="rounded-xl border p-4">
        <h2 className="font-medium">{t("profile")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.user.name} · {session.user.email}
        </p>
      </section>
      <section className="grid gap-3 rounded-xl border p-4">
        <h2 className="font-medium">{t("language")}</h2>
        <EnumSelect
          aria-label={t("language")}
          value={session.user.locale}
          onChange={(locale) => {
            updateSessionUser({ locale: locale as Locale })
            save.mutate({ locale: locale as Locale })
          }}
          options={LOCALES.map((locale) => ({ value: locale, label: locale.toUpperCase() }))}
        />
        <h2 className="font-medium">{t("theme")}</h2>
        <EnumSelect
          aria-label={t("theme")}
          value={session.user.theme}
          onChange={(mode) => {
            const next = mode as ThemeMode
            setTheme(next)
            updateSessionUser({ theme: next })
            save.mutate({ theme: next })
          }}
          options={THEME_MODES.map((mode) => ({ value: mode, label: theme(mode) }))}
        />
        {session.features.FEATURE_HIGH_CONTRAST ? (
          <label className="flex items-center justify-between text-sm">
            {t("contrast")}
            <Switch
              checked={session.user.highContrast}
              aria-label={t("contrast")}
              onCheckedChange={(highContrast) => {
                updateSessionUser({ highContrast })
                save.mutate({ highContrast })
              }}
            />
          </label>
        ) : null}
      </section>
      <section className="grid gap-3 rounded-xl border p-4">
        <h2 className="font-medium">{t("notifications")}</h2>
        <Button variant="outline" onClick={() => save.mutate({ emailEnabled: true, inAppEnabled: true, digestEnabled: false })}>
          {common("save")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save.mutate({ emailEnabled: false })}>
            {t("email")}
          </Button>
          <Button variant="outline" onClick={() => save.mutate({ inAppEnabled: true })}>
            {t("inApp")}
          </Button>
          <Button variant="outline" onClick={() => save.mutate({ digestEnabled: true })}>
            {t("digest")}
          </Button>
        </div>
      </section>
    </div>
  )
}

export function SessionsView() {
  const t = useTranslations("settings")
  const common = useTranslations("common")
  const query = useQuery({
    queryKey: ["sessions", "me"],
    queryFn: async () => (await api<SessionRow[]>("/api/v1/sessions")).data,
  })
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/v1/sessions/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      const current = query.data?.find((item) => item.id === id)?.current
      if (current) {
        loadPage("/login")
        return
      }
      query.refetch()
    },
  })
  const others = useMutation({
    mutationFn: () => api("/api/v1/sessions", { method: "DELETE" }),
    onSuccess: () => query.refetch(),
  })
  const all = useMutation({
    mutationFn: () => api("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ allDevices: true }) }),
    onSuccess: () => {
      loadPage("/login")
    },
  })
  return (
    <div>
      <PageHeader title={t("sessions")} description={t("sessionsDescription")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => others.mutate()}>
          {t("logoutOthers")}
        </Button>
        <Button variant="destructive" onClick={() => all.mutate()}>
          {t("logoutAll")}
        </Button>
      </div>
      {(query.data ?? []).length === 0 ? <EmptyState title={t("noSessions")} description={t("sessionsDescription")} /> : null}
      <ul className="divide-y rounded-xl border">
        {(query.data ?? []).map((item) => (
          <li key={item.id} className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {item.browser} · {item.device} {item.current ? `(${common("current")})` : ""}
              </p>
              <p className="text-muted-foreground">
                {item.location} · {item.ipAddress} · {item.lastActiveAt.slice(0, 16).replace("T", " ")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => revoke.mutate(item.id)}>
              {t("logoutSession")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
