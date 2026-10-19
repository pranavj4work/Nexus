"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/providers/auth-provider"
import { PriorityBadge, StatusBadge } from "@/components/data/badges"
import type { Project } from "@/types/domain"

const LINKS = [
  ["", "overview"],
  ["/board", "board"],
  ["/tasks", "tasks"],
  ["/members", "members"],
  ["/activity", "activity"],
  ["/settings", "settings"],
] as const

export function ProjectFrame({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const t = useTranslations("projects")
  const pathname = usePathname()
  const { session } = useAuth()
  const project = useQuery({
    queryKey: queryKeys.project(session.organization.id, projectId),
    queryFn: async () => (await api<Project>(`/api/v1/projects/${projectId}`)).data,
  })
  const base = `/projects/${projectId}`
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{project.data?.name ?? t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.data?.description}</p>
        {project.data ? (
          <div className="mt-3 flex gap-2">
            <StatusBadge value={project.data.status} />
            <PriorityBadge value={project.data.priority} />
          </div>
        ) : null}
      </div>
      <nav aria-label={t("sections")} className="mb-6 flex gap-1 overflow-x-auto border-b">
        {LINKS.map(([suffix, key]) => {
          const href = `${base}${suffix}`
          const active = pathname === href
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${active ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
            >
              {t(key)}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
