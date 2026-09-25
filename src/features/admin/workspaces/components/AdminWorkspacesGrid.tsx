import { LuBriefcaseBusiness } from "react-icons/lu";
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
  appWorkspaces: AppWorkspace[];
};

export function AdminWorkspacesGrid({
  appWorkspaces,
}: Props) {
  if (appWorkspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D1CD] px-4 py-12 text-center sm:py-16">
        <LuBriefcaseBusiness className="mb-3 size-8 text-[#737373]" />

        <p className="text-sm font-medium text-[#737373]">
          No hay workspaces creados desde la app
        </p>

        <p className="mt-1 text-xs text-[#737373]">
          Crea un workspace desde el boton superior para verlo en este listado.
        </p>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {appWorkspaces.map((appWorkspace) => (
        <WorkspaceCard
          key={appWorkspace.id}
          appWorkspace={appWorkspace}
        />
      ))}
    </section>
  );
}