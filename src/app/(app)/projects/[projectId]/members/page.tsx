import { ProjectMembers } from "@/features/projects/project-sections"

export default async function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <ProjectMembers projectId={projectId} />
}
