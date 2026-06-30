import { LuBriefcaseBusiness } from "react-icons/lu";
import type { TypeformWorkspace } from "@/features/typeform/services/typeform.service";
import { WorkspaceCard } from "./WorkspaceCard";

type AppWorkspace = {
  id: string;
  name: string;
  typeformId: string;
  _count: {
    users: number;
  };
};

type Props = {
  typeformWorkspaces: TypeformWorkspace[];
  appWorkspaces: AppWorkspace[];
};

export function AdminWorkspacesGrid({
  typeformWorkspaces,
  appWorkspaces,
}: Props) {
  const appWorkspacesByTypeformId = new Map(
    appWorkspaces.map((workspace) => [workspace.typeformId, workspace]),
  );

  if (typeformWorkspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
        <LuBriefcaseBusiness className="mb-3 size-8 text-zinc-700" />
        <p className="text-sm font-medium text-zinc-400">
          Typeform no devolvio workspaces
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Revisa el token o los permisos de la cuenta conectada.
        </p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {typeformWorkspaces.map((typeformWorkspace) => (
        <WorkspaceCard
          key={typeformWorkspace.id}
          typeformWorkspace={typeformWorkspace}
          appWorkspace={appWorkspacesByTypeformId.get(typeformWorkspace.id)}
        />
      ))}
    </section>
  );
}