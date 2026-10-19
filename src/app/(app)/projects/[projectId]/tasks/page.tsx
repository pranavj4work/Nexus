import { TasksView } from "@/features/tasks/tasks-view"

export default async function ProjectTasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <TasksView projectId={projectId} />
}
