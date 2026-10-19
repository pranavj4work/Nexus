import { ProjectActivity } from "@/features/projects/project-sections"

export default async function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <ProjectActivity projectId={projectId} />
}
