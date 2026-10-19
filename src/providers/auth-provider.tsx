"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { createContext, useContext, useState } from "react"
import { api } from "@/lib/api/client"
import { cacheTimes, queryKeys } from "@/lib/cache/query-keys"
import type { Permission, SessionPayload } from "@/types/domain"
import { hasPermission } from "@/lib/permissions"

const AuthContext = createContext<{
  session: SessionPayload
  switchOrganization: (organizationId: string) => Promise<void>
  updateSessionUser: (patch: Partial<SessionPayload["user"]>) => void
} | null>(null)

function sessionStamp(session: SessionPayload) {
  return `${session.user.id}:${session.organization.id}:${session.permissions.join(",")}`
}

export function AuthProvider({
  initial,
  children,
}: {
  initial: SessionPayload
  children: React.ReactNode
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [stamp, setStamp] = useState(sessionStamp(initial))
  const nextStamp = sessionStamp(initial)
  if (stamp !== nextStamp) {
    setStamp(nextStamp)
    queryClient.setQueryData(queryKeys.session, initial)
  }

  const query = useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => (await api<SessionPayload>("/api/v1/auth/session")).data,
    initialData: initial,
    staleTime: cacheTimes.session,
  })

  function updateSessionUser(patch: Partial<SessionPayload["user"]>) {
    queryClient.setQueryData<SessionPayload>(queryKeys.session, (current) =>
      current ? { ...current, user: { ...current.user, ...patch } } : current,
    )
  }

  async function switchOrganization(organizationId: string) {
    const result = await api<SessionPayload>("/api/v1/auth/switch-organization", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    })
    queryClient.setQueryData(queryKeys.session, result.data)
    await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "session" })
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ session: query.data, switchOrganization, updateSessionUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}

export function useCan(permission: Permission) {
  const { session } = useAuth()
  return hasPermission(session.permissions, permission)
}
