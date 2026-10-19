"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api/client"
import { useAuth } from "@/providers/auth-provider"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type SearchHit = { id: string; title: string; href: string }
type SearchResponse = {
  projects: SearchHit[]
  tasks: SearchHit[]
  users: SearchHit[]
  settings: { id: string; titleKey: string; href: string }[]
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("search")
  const nav = useTranslations()
  const router = useRouter()
  const { session } = useAuth()
  const [query, setQuery] = useState("")
  const debounced = useDebouncedValue(query, 250)
  const results = useQuery({
    queryKey: ["search", session.organization.id, debounced],
    queryFn: async () => (await api<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(debounced)}`)).data,
    enabled: open && debounced.trim().length >= 2,
  })

  function go(href: string) {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  const groups: { key: string; label: string; items: SearchHit[] }[] = [
    { key: "projects", label: t("projects"), items: results.data?.projects ?? [] },
    { key: "tasks", label: t("tasks"), items: results.data?.tasks ?? [] },
    { key: "users", label: t("users"), items: results.data?.users ?? [] },
    {
      key: "settings",
      label: t("settings"),
      items: (results.data?.settings ?? []).map((item) => ({ id: item.id, href: item.href, title: nav(item.titleKey) })),
    },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("title")} description={t("placeholder")}>
      <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={setQuery} placeholder={t("placeholder")} aria-label={t("title")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          {groups.map((group) =>
            group.items.length ? (
              <CommandGroup key={group.key} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem key={item.id} value={`${group.key}-${item.title}`} onSelect={() => go(item.href)}>
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null,
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
