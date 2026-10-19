"use client"

import type { Permission } from "@/types/domain"
import { useCan } from "@/providers/auth-provider"

export function Can({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  if (!useCan(permission)) return null
  return children
}
