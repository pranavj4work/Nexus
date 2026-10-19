"use client"

import { Button } from "@/components/ui/button"
import type { Pagination } from "@/types/domain"

export function PaginationBar({
  pagination,
  onPage,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  pagination?: Pagination
  onPage: (page: number) => void
  previousLabel: string
  nextLabel: string
  pageLabel: string
}) {
  if (!pagination || pagination.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm">
      <p className="text-muted-foreground">{pageLabel}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
          {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPage(pagination.page + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
