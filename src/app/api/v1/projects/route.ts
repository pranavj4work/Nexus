import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { numberParam, oneOf, searchParams } from "@/lib/api/query"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, projectSchema } from "@/schemas"
import { createProject, listProjects } from "@/services/project-service"
import { PRIORITIES, PROJECT_STATUSES } from "@/types/domain"

export async function GET(request: Request) {
  return runRoute(async () => {
    const params = searchParams(request)
    const result = await listProjects(await getRequestContext(), {
      page: numberParam(params, "page", 1),
      pageSize: numberParam(params, "pageSize", 20),
      search: params.get("search") ?? undefined,
      status: oneOf(params.get("status"), PROJECT_STATUSES),
      priority: oneOf(params.get("priority"), PRIORITIES),
      sort: params.get("sort") ?? undefined,
      direction: params.get("direction") === "asc" ? "asc" : "desc",
    })
    return apiSuccess(result.data, result.pagination)
  })
}

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(projectSchema, await request.json())
    const project = await createProject(await getRequestContext(), input)
    return apiSuccess(project, undefined, 201)
  })
}
