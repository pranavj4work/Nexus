"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function useUrlFilters() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  function setParams(updates: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    if (resetPage && !("page" in updates)) next.delete("page")
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return { params, setParams }
}
