import type { Pagination } from "@/types/domain"

export function paginate<T>(items: T[], page = 1, pageSize = 20): { data: T[]; pagination: Pagination } {
  const size = Math.min(Math.max(pageSize, 1), 100)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(page, 1), total === 0 ? 1 : totalPages)
  const start = (current - 1) * size
  return {
    data: items.slice(start, start + size),
    pagination: { page: current, pageSize: size, total, totalPages },
  }
}

export function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right
  return String(left).localeCompare(String(right))
}
