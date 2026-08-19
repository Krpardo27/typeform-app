"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuLoader } from "react-icons/lu";
import { updateUserWorkspaces } from "../actions/update-user-workspaces";

type Workspace = {
  id: string;
  name: string;
  typeformId: string;
};

type WorkspaceRole = "VIEWER" | "EDITOR";

type WorkspaceAssignment = {
  workspaceId: string;
  role: WorkspaceRole;
};

type UpdateUserWorkspacesResult = {
  success: boolean;
  changed: boolean;
  message: string;
};

type Props = {
  userId: string;
  workspaces: Workspace[];
  assignedWorkspaces: WorkspaceAssignment[];
};

export function UserWorkspaceForm({
  userId,
  workspaces,
  assignedWorkspaces,
}: Props) {
  const [assignments, setAssignments] =
    useState<WorkspaceAssignment[]>(assignedWorkspaces);

  const [isPending, startTransition] = useTransition();

  const initialValue = useMemo(
    () =>
      [...assignedWorkspaces]
        .sort((a, b) => a.workspaceId.localeCompare(b.workspaceId))
        .map((item) => `${item.workspaceId}:${item.role}`)
        .join("|"),
    [assignedWorkspaces],
  );

  const currentValue = useMemo(
    () =>
      [...assignments]
        .sort((a, b) => a.workspaceId.localeCompare(b.workspaceId))
        .map((item) => `${item.workspaceId}:${item.role}`)
        .join("|"),
    [assignments],
  );

  const hasChanges = initialValue !== currentValue;

  function toggleWorkspace(workspaceId: string) {
    setAssignments((current) => {
      const exists = current.some((item) => item.workspaceId === workspaceId);

      if (exists) {
        return current.filter((item) => item.workspaceId !== workspaceId);
      }

      return [...current, { workspaceId, role: "VIEWER" }];
    });
  }

  function updateRole(workspaceId: string, role: WorkspaceRole) {
    setAssignments((current) =>
      current.map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  async function handleSubmit() {
    if (!hasChanges) {
      toast.info("No se detectaron cambios");
      return;
    }

    const selectedPreview = assignments
      .slice(0, 3)
      .map((assignment) => {
        const workspace = workspaces.find(
          (item) => item.id === assignment.workspaceId,
        );

        return `${workspace?.name ?? assignment.workspaceId} (${assignment.role})`;
      })
      .join("\n");

    const result = await Swal.fire({
      title: "Guardar permisos",
      text:
        assignments.length > 3
          ? `${selectedPreview}\n... y ${assignments.length - 3} workspace(s) más.`
          : selectedPreview || "El usuario quedará sin workspaces asignados.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#171717",
      confirmButtonColor: "#18181B",
    });

    if (!result.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const payload = {
        userId,
        workspaceIds: assignments.map(
          (item) => `${item.workspaceId}::${item.role}`,
        ),
      };
      const response = (await updateUserWorkspaces(
        payload,
      )) as UpdateUserWorkspacesResult;

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      if (!response.changed) {
        toast.info(response.message);
        return;
      }

      toast.success(response.message);
    });
  }

  const selectedCount = assignments.length;

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      {/* HEADER */}
      <div className="border-b border-[#E5E5E5] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#171717]">
          Workspaces autorizados
        </h2>

        <p className="mt-1 text-sm text-[#737373]">
          Selecciona las radios o marcas y el rol dentro de cada una.
        </p>

        <div className="mt-3 grid gap-2 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-3 text-xs text-[#737373] md:grid-cols-2">
          <p>
            <span className="font-semibold text-[#171717]">Viewer:</span> solo
            lectura de formularios y respuestas.
          </p>
          <p>
            <span className="font-semibold text-[#171717]">Editor:</span> puede
            crear y duplicar formularios en su workspace.
          </p>
        </div>

        <div className="mt-3 inline-flex rounded-md border border-[#18181B]/30 bg-[#18181B]/10 px-3 py-1 text-sm text-[#18181B]">
          {selectedCount} workspace{selectedCount !== 1 ? "s" : ""} asignado
          {selectedCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* GRID */}
      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#737373]">
            Seleccionar workspaces
          </span>
          <select
            multiple
            size={Math.min(Math.max(workspaces.length, 4), 12)}
            value={assignments.map((a) => a.workspaceId)}
            onChange={(event) => {
              const selectedIds = Array.from(
                event.target.selectedOptions,
                (opt) => opt.value,
              );
              const currentIds = new Set(assignments.map((a) => a.workspaceId));
              const newIds = new Set(selectedIds);

              const toRemove = [...currentIds].filter((id) => !newIds.has(id));
              const toAdd = [...newIds].filter((id) => !currentIds.has(id));

              toRemove.forEach((id) => toggleWorkspace(id));
              toAdd.forEach((id) => toggleWorkspace(id));
            }}
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/20"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} ({workspace.typeformId})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#737373]">
            Usa Ctrl+Click para multi-selección.
          </p>
        </label>

        {assignments.length > 0 && (
            <div className="rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#737373]">
              Roles por workspace
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => {
                const workspace = workspaces.find(
                  (w) => w.id === assignment.workspaceId,
                );
                if (!workspace) return null;

                return (
                  <div
                    key={assignment.workspaceId}
                    className="rounded-lg border border-[#18181B]/20 bg-[#18181B]/5 p-3 transition hover:border-[#18181B]/40 hover:bg-[#18181B]/10"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#18181B]">
                          {workspace.name}
                        </p>
                        <p className="truncate text-xs text-[#737373]">
                          {workspace.typeformId}
                        </p>
                      </div>
                    </div>
                    <select
                      value={assignment.role}
                      onChange={(event) =>
                        updateRole(
                          assignment.workspaceId,
                          event.target.value as WorkspaceRole,
                        )
                      }
                      className="w-full rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-2.5 py-2 text-xs font-medium text-[#171717] outline-none transition focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B]/50"
                    >
                      <option value="VIEWER">Viewer (lectura)</option>
                      <option value="EDITOR">Editor (crear/duplicar)</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-[#E5E5E5] px-5 py-4">
        <p className="text-xs text-[#737373]">
          {hasChanges ? "Tienes cambios sin guardar" : "Sin cambios pendientes"}
        </p>

        <button
          type="button"
          disabled={isPending || !hasChanges}
          onClick={handleSubmit}
          className="flex items-center cursor-pointer gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#27272A] disabled:opacity-50"
        >
          {isPending && <LuLoader className="size-4 animate-spin" />}

          {isPending ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>
    </div>
  );
}
