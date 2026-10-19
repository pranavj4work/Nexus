import { ProjectSettings } from "@/features/projects/project-sections"

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <ProjectSettings projectId={projectId} />
}
