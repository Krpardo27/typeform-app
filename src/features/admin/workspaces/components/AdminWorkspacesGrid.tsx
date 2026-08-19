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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] px-4 py-12 text-center sm:py-16">
        <LuBriefcaseBusiness className="mb-3 size-8 text-[#737373]" />
        <p className="text-sm font-medium text-[#737373]">
          Typeform no devolvio workspaces
        </p>
        <p className="mt-1 text-xs text-[#737373]">
          Revisa el token o los permisos de la cuenta conectada.
        </p>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
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