"use client";

import { useId } from "react";
import { LuCheck, LuSearch, LuX } from "react-icons/lu";
import { WorkspaceRadioLogo } from "./WorkspaceRadioLogo";
import { getWorkspaceRadioLogo } from "../../../../../config/radio-logos";

export type WorkspaceAccessRole = "VIEWER" | "EDITOR";

export type WorkspaceAccessOption = {
  id: string;
  name: string;
  typeformId: string;
  templateFormTypeformId?: string | null;
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
  disabled?: boolean;
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
  disabled = false,
}: WorkspaceAccessSelectorProps) {
  const id = useId();
  const selectedWorkspaceIds = new Set(
    assignments.map((assignment) => assignment.workspaceId),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const radioOptions = workspaces.map((workspace) => ({
    ...workspace,
    logo: getWorkspaceRadioLogo({ ...workspace, templateFormTypeformId: workspace.templateFormTypeformId ?? null }),
  }));
  const logoCounts = new Map<string, number>();
  for (const workspace of radioOptions) {
    if (workspace.logo) logoCounts.set(workspace.logo.src, (logoCounts.get(workspace.logo.src) ?? 0) + 1);
  }
  const filteredWorkspaces = normalizedQuery
    ? radioOptions.filter((workspace) =>
        `${workspace.name} ${workspace.typeformId}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : radioOptions;

  return (
    <section
      aria-label="Selección de workspaces y roles"
      className="grid min-w-0 gap-6 bg-white text-sm text-[#171717] xl:grid-cols-2 xl:gap-8"
    >
      <div className="min-w-0" aria-labelledby={`${id}-available`}>
        <div className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 id={`${id}-available`} className="text-sm font-semibold">
                Workspaces disponibles
              </h3>
              <p id={`${id}-description`} className="mt-1 text-sm text-[#595954]">
                {workspaceDescription}
              </p>
            </div>

            {assignments.length > 0 && onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                aria-label="Quitar todos los workspaces seleccionados"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[#595954] enabled:hover:bg-[#F5F5F3] enabled:hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LuX aria-hidden="true" className="size-3.5" />
                Limpiar
              </button>
            )}
          </div>

          <div className="relative mt-3">
            <label htmlFor={`${id}-search`} className="sr-only">
              Buscar workspaces por nombre o Typeform ID
            </label>
            <LuSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#595954]" />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              disabled={disabled}
              aria-describedby={`${id}-description`}
              placeholder="Buscar por nombre o Typeform ID"
              className="min-h-11 w-full rounded-md border border-[#D1D1CD] bg-white py-2.5 pl-9 pr-3 text-sm text-[#171717] placeholder:text-[#595954] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-not-allowed disabled:bg-[#F5F5F3] disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid max-h-90 grid-cols-2 gap-2 overflow-y-auto border-t border-[#E5E5E5] p-1 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredWorkspaces.length === 0 ? (
            <p className="col-span-full py-6 text-sm text-[#595954]">
              {workspaces.length === 0
                ? "No hay workspaces disponibles para asignar."
                : "No hay workspaces que coincidan con la búsqueda. Prueba con otro nombre o Typeform ID."}
            </p>
          ) : (
            filteredWorkspaces.map((workspace) => {
              const isSelected = selectedWorkspaceIds.has(workspace.id);
              const showName = workspace.logo && (
                (logoCounts.get(workspace.logo.src) ?? 0) > 1 ||
                workspace.name.trim().toUpperCase() !== workspace.logo.name
              );

              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onToggleWorkspace(workspace.id)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`Seleccionar workspace ${workspace.name}`}
                  title={`${workspace.name} · ID ${workspace.typeformId}`}
                  className={`relative flex min-h-28 min-w-0 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                    isSelected
                      ? "border-[#A33116] bg-[#FFF8F5]"
                      : "border-[#E5E5E5] bg-white enabled:hover:border-[#FF5C35]/60 enabled:hover:bg-[#FAFAFA]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute right-2 top-2 flex size-5 shrink-0 items-center justify-center rounded-sm border ${
                      isSelected
                        ? "border-[#A33116] bg-[#A33116] text-white"
                        : "border-[#95958F] bg-white"
                    }`}
                  >
                    {isSelected && <LuCheck className="size-3.5" />}
                  </span>
                  <WorkspaceRadioLogo workspace={workspace} size={64} />
                  {showName && (
                    <span className="block max-w-full wrap-anywhere lg:text-sm text-sm font-medium leading-5 text-[#595954]">
                      {workspace.name}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <aside className="min-w-0" aria-labelledby={`${id}-roles`}>
        <h3 id={`${id}-roles`} className="text-sm font-semibold">
          Roles por workspace
        </h3>
        <p className="mt-1 text-sm text-[#595954]">
          Define un rol para cada workspace seleccionado.
        </p>

        {assignments.length === 0 ? (
          <div className="mt-4 border-t border-[#E5E5E5] py-6">
            <p className="text-sm font-medium text-[#595954]">
              Sin workspaces seleccionados
            </p>
            <p className="mt-1 text-sm text-[#595954]">
              {emptySelectionDescription}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#E5E5E5] border-y border-[#E5E5E5]">
            {assignments.map((assignment) => {
              const workspace = radioOptions.find(
                (item) => item.id === assignment.workspaceId,
              );
              if (!workspace) return null;

              return (
                <li
                  key={assignment.workspaceId}
                  className="py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {workspace.logo && <WorkspaceRadioLogo workspace={workspace} size={48} />}
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-normal wrap-anywhere text-sm font-medium">
                          {workspace.name}
                        </p>
                        <p className="mt-1 wrap-anywhere text-sm text-[#595954]">
                          ID {workspace.typeformId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleWorkspace(workspace.id)}
                      disabled={disabled}
                      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#595954] enabled:hover:bg-[#F5F5F3] enabled:hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Quitar workspace ${workspace.name}`}
                    >
                      <LuX aria-hidden="true" className="size-4" />
                    </button>
                  </div>

                  <fieldset
                    disabled={disabled}
                    aria-describedby={`${id}-${workspace.id}-role-hint`}
                    className="mt-3 min-w-0"
                  >
                    <legend className="sr-only">Rol en {workspace.name}</legend>
                    <div className="flex flex-wrap gap-2">
                      {(["VIEWER", "EDITOR"] as const).map((role) => (
                        <label
                          key={role}
                          htmlFor={`${id}-${workspace.id}-${role}`}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${
                            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                          } ${
                            assignment.role === role
                              ? "border-[#FF5C35] bg-white text-[#171717]"
                              : "border-[#D1D1CD] text-[#595954]"
                          }`}
                        >
                          <input
                            id={`${id}-${workspace.id}-${role}`}
                            type="radio"
                            name={`${id}-${workspace.id}-role`}
                            value={role}
                            checked={assignment.role === role}
                            onChange={() => onRoleChange(workspace.id, role)}
                            disabled={disabled}
                            className="size-4 accent-[#FF5C35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]"
                          />
                          {role === "VIEWER" ? "Lector" : "Editor"}
                        </label>
                      ))}
                    </div>
                    <p id={`${id}-${workspace.id}-role-hint`} className="mt-2 text-sm text-[#595954]">
                      {assignment.role === "VIEWER"
                        ? "Consulta de formularios y respuestas."
                        : "Permite duplicar formularios base en este workspace."}
                    </p>
                  </fieldset>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </section>
  );
}