import { ProjectOverview } from "@/features/projects/project-sections"

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <ProjectOverview projectId={projectId} />
}
