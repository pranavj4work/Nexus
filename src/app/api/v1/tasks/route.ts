import { apiSuccess, runRoute } from "@/lib/api/envelope"
import { numberParam, oneOf, searchParams } from "@/lib/api/query"
import { getRequestContext } from "@/lib/auth/request-context"
import { parseInput, taskSchema } from "@/schemas"
import { createTask, listTasks } from "@/services/task-service"
import { PRIORITIES, TASK_STATUSES } from "@/types/domain"

export async function GET(request: Request) {
  return runRoute(async () => {
    const params = searchParams(request)
    const result = await listTasks(await getRequestContext(), {
      page: numberParam(params, "page", 1),
      pageSize: numberParam(params, "pageSize", params.get("projectId") ? 100 : 20),
      search: params.get("search") ?? undefined,
      status: oneOf(params.get("status"), TASK_STATUSES),
      priority: oneOf(params.get("priority"), PRIORITIES),
      assigneeId: params.get("assigneeId") ?? undefined,
      projectId: params.get("projectId") ?? undefined,
      label: params.get("label") ?? undefined,
      sort: params.get("sort") ?? undefined,
      direction: params.get("direction") === "asc" ? "asc" : "desc",
    })
    return apiSuccess(result.data, result.pagination)
  })
}

export async function POST(request: Request) {
  return runRoute(async () => {
    const input = parseInput(taskSchema, await request.json())
    return apiSuccess(await createTask(await getRequestContext(), input), undefined, 201)
  })
}
