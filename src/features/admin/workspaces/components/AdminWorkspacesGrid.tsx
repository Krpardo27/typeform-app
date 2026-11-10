import { LuBriefcaseBusiness } from "react-icons/lu";
import { WorkspaceCard } from "./WorkspaceCard";

type AppWorkspace = {
  id: string;
  name: string;
  typeformId: string;
  templateFormTypeformId: string | null;
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
      <div className="rounded-md border border-[#FF5C35]/30 bg-white px-5 py-8">
        <LuBriefcaseBusiness aria-hidden="true" className="mb-3 size-5 text-[#A53318]" />

        <p className="text-base font-medium text-[#171717]">
          Todavía no hay workspaces
        </p>

        <p className="mt-2 max-w-lg text-sm leading-6 text-[#595954]">
          Usa «Crear workspace» para elegir una radio y copiar su formulario base.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Workspaces disponibles" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {appWorkspaces.map((appWorkspace) => (
        <WorkspaceCard
          key={appWorkspace.id}
          appWorkspace={appWorkspace}
        />
      ))}
    </section>
  );
}