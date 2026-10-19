import { ProjectFrame } from "@/features/projects/project-frame"

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  return <ProjectFrame projectId={projectId}>{children}</ProjectFrame>
}
