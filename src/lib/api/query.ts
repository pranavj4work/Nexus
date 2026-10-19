export function searchParams(request: Request) {
  return new URL(request.url).searchParams
}

export function numberParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number(params.get(key))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function oneOf<T extends string>(value: string | null, allowed: readonly T[]) {
  if (!value) return undefined
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}
