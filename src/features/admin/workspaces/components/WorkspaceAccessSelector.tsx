"use client";

import {
  LuCheck,
  LuEye,
  LuPencil,
  LuSearch,
  LuShieldCheck,
  LuX,
} from "react-icons/lu";

export type WorkspaceAccessRole = "VIEWER" | "EDITOR";

export type WorkspaceAccessOption = {
  id: string;
  name: string;
  typeformId: string;
};

export type WorkspaceAccessAssignment = {
  workspaceId: string;
  role: WorkspaceAccessRole;
};

type WorkspaceAccessSelectorProps = {
  workspaces: WorkspaceAccessOption[];
  assignments: WorkspaceAccessAssignment[];
  query: string;
  onQueryChange: (query: string) => void;
  onToggleWorkspace: (workspaceId: string) => void;
  onRoleChange: (workspaceId: string, role: WorkspaceAccessRole) => void;
  onClear?: () => void;
  workspaceDescription: string;
  emptySelectionDescription: string;
};

export function WorkspaceAccessSelector({
  workspaces,
  assignments,
  query,
  onQueryChange,
  onToggleWorkspace,
  onRoleChange,
  onClear,
  workspaceDescription,
  emptySelectionDescription,
}: WorkspaceAccessSelectorProps) {
  const selectedWorkspaceIds = new Set(
    assignments.map((assignment) => assignment.workspaceId),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWorkspaces = normalizedQuery
    ? workspaces.filter((workspace) =>
        `${workspace.name} ${workspace.typeformId}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : workspaces;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="border-b border-[#E5E5E5] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">
                Workspaces disponibles
              </h3>
              <p className="mt-0.5 text-xs text-[#737373]">
                {workspaceDescription}
              </p>
            </div>

            {assignments.length > 0 && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-2.5 py-1.5 text-xs font-medium text-[#737373] transition hover:border-[#DC2626]/35 hover:text-[#DC2626]"
              >
                <LuX className="size-3.5" />
                Limpiar
              </button>
            )}
          </div>

          <label className="relative mt-4 block">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por nombre o Typeform ID"
              className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] py-2.5 pl-9 pr-3 text-sm text-[#171717] outline-none transition focus:border-[#18181B] focus:bg-white focus:ring-2 focus:ring-[#18181B]/10"
            />
          </label>
        </div>

        <div className="grid max-h-90 gap-2 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-[#E5E5E5] px-4 py-8 text-center text-sm text-[#737373]">
              No hay workspaces que coincidan con la busqueda.
            </p>
          ) : (
            filteredWorkspaces.map((workspace) => {
              const isSelected = selectedWorkspaceIds.has(workspace.id);

              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onToggleWorkspace(workspace.id)}
                  aria-pressed={isSelected}
                  className={`group flex min-h-24 cursor-pointer flex-col items-start justify-between rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-[#18181B] bg-[#18181B] text-white shadow-sm"
                      : "border-[#E5E5E5] bg-[#F8F8F7] text-[#171717] hover:border-[#18181B]/25 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {workspace.name}
                      </span>
                      <span
                        className={`mt-1 block truncate text-xs ${
                          isSelected ? "text-white/60" : "text-[#737373]"
                        }`}
                      >
                        {workspace.typeformId}
                      </span>
                    </span>

                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-white/35 bg-white text-[#18181B]"
                          : "border-[#D1D1CD] text-transparent group-hover:text-[#737373]"
                      }`}
                    >
                      <LuCheck className="size-3.5" />
                    </span>
                  </span>

                  <span
                    className={`mt-3 rounded-full px-2 py-1 text-[11px] font-medium ${
                      isSelected
                        ? "bg-white/10 text-white/75"
                        : "bg-white text-[#737373]"
                    }`}
                  >
                    {isSelected ? "Seleccionado" : "Click para seleccionar"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-[#E5E5E5] bg-[#F8F8F7] p-4">
        <div className="mb-4 flex items-center gap-2">
          <LuShieldCheck className="size-4 text-[#18181B]" />
          <h3 className="text-sm font-semibold text-[#171717]">
            Roles por workspace
          </h3>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D1D1CD] bg-white px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#737373]">
              Sin workspaces seleccionados
            </p>
            <p className="mt-1 text-xs text-[#A3A3A3]">
              {emptySelectionDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const workspace = workspaces.find(
                (item) => item.id === assignment.workspaceId,
              );
              if (!workspace) return null;

              return (
                <div
                  key={assignment.workspaceId}
                  className="rounded-xl border border-[#E5E5E5] bg-white p-3"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#171717]">
                        {workspace.name}
                      </p>
                      <p className="truncate text-xs text-[#737373]">
                        {workspace.typeformId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleWorkspace(workspace.id)}
                      className="cursor-pointer rounded-lg p-1.5 text-[#A3A3A3] transition hover:bg-[#F5F5F5] hover:text-[#DC2626]"
                      aria-label={`Quitar ${workspace.name}`}
                    >
                      <LuX className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F5F5F5] p-1">
                    <button
                      type="button"
                      onClick={() => onRoleChange(workspace.id, "VIEWER")}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition ${
                        assignment.role === "VIEWER"
                          ? "bg-white text-[#18181B] shadow-sm"
                          : "text-[#737373] hover:text-[#18181B]"
                      }`}
                    >
                      <LuEye className="size-3.5" />
                      Viewer
                    </button>
                    <button
                      type="button"
                      onClick={() => onRoleChange(workspace.id, "EDITOR")}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition ${
                        assignment.role === "EDITOR"
                          ? "bg-white text-[#18181B] shadow-sm"
                          : "text-[#737373] hover:text-[#18181B]"
                      }`}
                    >
                      <LuPencil className="size-3.5" />
                      Editor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </section>
  );
}