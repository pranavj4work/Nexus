"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useSyncExternalStore } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  Command,
  FolderKanban,
  Languages,
  LayoutDashboard,
  ListTodo,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api/client"
import { loadPage } from "@/lib/load-page"
import { useAuth } from "@/providers/auth-provider"
import { visibleNavigation } from "@/lib/permissions/navigation"
import { CommandPalette } from "@/components/layout/command-palette"
import { NotificationMenu } from "@/components/layout/notification-menu"
import { LOCALES, type Locale, type ThemeMode } from "@/types/domain"

function isApplePlatform() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
}

function SearchShortcut() {
  const apple = useSyncExternalStore(
    () => () => {},
    isApplePlatform,
    () => true,
  )
  return (
    <kbd className="inline-flex h-5 shrink-0 items-center gap-1 rounded-md border bg-muted px-1.5 font-sans text-[11px] leading-none text-foreground">
      {apple ? <Command className="size-3" /> : <span>Ctrl</span>}
      <span>K</span>
    </kbd>
  )
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  tasks: ListTodo,
  notifications: Bell,
  reports: BarChart3,
  assistant: Sparkles,
  settings: Settings,
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const { session } = useAuth()
  const { main, admin } = visibleNavigation(session.permissions, session.features)
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={t("main")}>
      {main.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = ICONS[item.key] ?? LayoutDashboard
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70"}`}
          >
            <Icon className="size-4" />
            {t(item.key)}
          </Link>
        )
      })}
      {admin.length > 0 ? (
        <div className="mt-4">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{t("admin")}</p>
          {admin.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/70"}`}
              >
                <Shield className="size-4" />
                {t(item.key)}
              </Link>
            )
          })}
        </div>
      ) : null}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, switchOrganization, updateSessionUser } = useAuth()
  const t = useTranslations()
  const locale = useLocale()
  const { setTheme, theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null)
  const superAdmin = session.roles.some((role) => role.key === "SUPER_ADMIN")
  const side = locale === "ar" ? "right" : "left"

  useEffect(() => {
    document.documentElement.classList.toggle(
      "high-contrast",
      session.user.highContrast && session.features.FEATURE_HIGH_CONTRAST,
    )
    document.documentElement.dataset.density = session.theme.density
  }, [session])

  useEffect(() => {
    if (theme !== session.user.theme) setTheme(session.user.theme)
  }, [session.user.id, session.user.theme, setTheme, theme])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        if (session.features.FEATURE_GLOBAL_SEARCH) setPalette(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [session.features.FEATURE_GLOBAL_SEARCH])

  async function setLocale(next: Locale) {
    await api("/api/v1/preferences", { method: "PATCH", body: JSON.stringify({ locale: next }) })
    window.location.reload()
  }

  async function setMode(mode: ThemeMode) {
    const previous = session.user.theme
    setTheme(mode)
    updateSessionUser({ theme: mode })
    try {
      await api("/api/v1/preferences", { method: "PATCH", body: JSON.stringify({ theme: mode }) })
    } catch {
      setTheme(previous)
      updateSessionUser({ theme: previous })
      toast.error(t("errors.generic"))
    }
  }

  async function changeOrganization(organizationId: string) {
    if (organizationId === session.organization.id || switchingOrg) return
    setSwitchingOrg(organizationId)
    try {
      await switchOrganization(organizationId)
    } catch {
      toast.error(t("errors.generic"))
    } finally {
      setSwitchingOrg(null)
    }
  }

  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({}) })
    loadPage("/login")
  }

  const brand = {
    "--primary": session.theme.primary,
    "--primary-foreground": session.theme.primaryForeground,
    "--secondary": session.theme.secondary,
    "--secondary-foreground": session.theme.secondaryForeground,
    "--radius": session.theme.radius,
    "--sidebar-primary": session.theme.primary,
  } as React.CSSProperties

  return (
    <div className="flex min-h-screen bg-background" style={brand} data-density={session.theme.density}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        {t("common.skip")}
      </a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {session.theme.logoText.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.theme.logoText}</p>
            <p className="truncate text-xs text-muted-foreground">{session.organization.name}</p>
            <p className="truncate text-xs font-medium">{session.roles.map((role) => role.name).join(", ")}</p>
          </div>
        </div>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label={t("common.openMenu")} />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side={side} className="w-72 p-0">
              <div className="border-b px-4 py-4">
                <p className="text-sm font-semibold">{session.organization.name}</p>
                <p className="text-xs text-muted-foreground">{session.roles.map((role) => role.name).join(", ")}</p>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          {session.features.FEATURE_GLOBAL_SEARCH ? (
            <Button variant="outline" className="hidden h-8 min-w-40 max-w-64 flex-1 justify-between px-2.5 text-muted-foreground sm:flex" onClick={() => setPalette(true)}>
              <span className="flex min-w-0 items-center gap-2">
                <Search className="size-4 shrink-0" />
                <span className="truncate">{t("search.shortcut")}</span>
              </span>
              <SearchShortcut />
            </Button>
          ) : null}
          <div className="ms-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant={superAdmin ? "default" : "outline"}
                    size="sm"
                    className={superAdmin ? "!h-auto max-w-56 flex-col items-start gap-0 px-2.5 py-1" : "max-w-40"}
                    aria-label={t("nav.switchOrganization")}
                  />
                }
              >
                {superAdmin ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-wide">{t("nav.switchOrganization")}</span>
                    <span className="flex max-w-full items-center gap-1 text-xs">
                      <Building2 className="size-3" />
                      <span className="truncate">{session.organization.name}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 />
                    <span className="truncate">{session.organization.name}</span>
                  </>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{t("nav.switchOrganization")}</p>
                {session.organizations.map((organization) => {
                  const current = organization.id === session.organization.id
                  return (
                    <DropdownMenuItem
                      key={organization.id}
                      aria-current={current ? "true" : undefined}
                      disabled={switchingOrg !== null}
                      onClick={() => void changeOrganization(organization.id)}
                    >
                      <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                      {current ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" aria-label={t("settings.language")} data-testid="locale-trigger" />}
              >
                <Languages />
                {locale.toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LOCALES.map((item) => (
                  <DropdownMenuItem key={item} onClick={() => setLocale(item)}>
                    {item.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" aria-label={t("theme.label")} data-testid="theme-trigger" />}
              >
                {session.user.theme === "dark" ? <Moon /> : session.user.theme === "system" ? <Monitor /> : <Sun />}
                {t(`theme.${session.user.theme}`)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <DropdownMenuItem key={mode} onClick={() => setMode(mode)}>
                    {t(`theme.${mode}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {session.features.FEATURE_NOTIFICATIONS ? <NotificationMenu /> : null}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={session.user.name} />}>
                <UserRound />
                <span className="hidden max-w-36 truncate lg:inline">{session.roles.map((role) => role.name).join(", ")}</span>
                <span className="lg:hidden">{session.user.initials}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <p className="px-2 py-1.5 text-xs text-muted-foreground">{session.roles.map((role) => role.name).join(", ")}</p>
                <DropdownMenuItem render={<Link href="/settings" />}>{t("nav.settings")}</DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>{t("common.signOut")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
      {session.features.FEATURE_GLOBAL_SEARCH ? <CommandPalette open={palette} onOpenChange={setPalette} /> : null}
    </div>
  )
}
