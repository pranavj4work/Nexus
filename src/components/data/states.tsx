import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-16 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string
  description: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border px-6 py-12 text-center" role="alert">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  )
}
