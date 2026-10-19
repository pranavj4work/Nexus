"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cacheTimes } from "@/lib/cache/query-keys"
import { ApiError } from "@/lib/api/client"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: cacheTimes.lists,
            gcTime: cacheTimes.gcTime,
            refetchOnWindowFocus: false,
            retry: (count, error) => {
              if (error instanceof ApiError && [400, 401, 403, 404, 409, 429].includes(error.status)) return false
              return count < 1
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
