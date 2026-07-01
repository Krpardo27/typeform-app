import { redirect } from "next/navigation";

export default async function WorkspaceResponsesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  redirect(`/workspaces/${workspaceId}/forms?view=responses`);
}
