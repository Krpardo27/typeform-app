import { LuRadio } from "react-icons/lu";

type WorkspaceHomeHeaderProps = {
  workspaceName: string;
  workspaceRole: string;
};

export function WorkspaceHomeHeader({
  workspaceName,
  workspaceRole,
}: WorkspaceHomeHeaderProps) {
  const displayName = workspaceName.trim() || "Radio sin nombre";
  const role = workspaceRole.trim().toUpperCase();
  const isEditor = role === "EDITOR";
  const roleLabel = isEditor
    ? "Editor"
    : role === "VIEWER"
      ? "Lector"
      : "Sin rol definido";

  return (
    <header className="mt-6 min-w-0 border-b border-[#E5E5E5] pb-5">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#737373]">
            <LuRadio
              aria-hidden="true"
              className="size-3.5 shrink-0 text-[#FF5C35]"
            />
            <span>Workspace</span>
          </div>
          <dl className="border-l border-[#D1D1CD] pl-3 text-sm leading-5 text-[#595954]">
            <div>
              <dt className="sr-only">Rol</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </div>

        <h1 className="wrap-anywhere text-2xl font-semibold leading-tight tracking-tight text-[#171717]">
          {displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#595954]">
          {isEditor
            ? "Gestiona los formularios y consulta las respuestas de esta radio."
            : "Consulta los formularios y las respuestas de esta radio."}
        </p>
      </div>
    </header>
  );
}
