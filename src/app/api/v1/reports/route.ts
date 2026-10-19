import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { searchParams } from "@/lib/api/query"
import { getRequestContext } from "@/lib/auth/request-context"
import { getReport } from "@/services/report-service"

function rangeFrom(params: URLSearchParams) {
  const now = new Date()
  const range = params.get("range") ?? "30d"
  if (range === "custom" && params.get("from") && params.get("to")) {
    return { from: new Date(params.get("from") as string).toISOString(), to: new Date(params.get("to") as string).toISOString() }
  }
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - (days - 1))
  return { from: from.toISOString(), to: now.toISOString() }
}

export async function GET(request: Request) {
  return runRoute(async () => {
    const params = searchParams(request)
    return apiSuccess(await getReport(await getRequestContext(), { ...rangeFrom(params), projectId: params.get("projectId") }))
  })
}
