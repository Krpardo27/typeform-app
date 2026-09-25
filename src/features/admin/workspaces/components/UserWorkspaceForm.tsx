"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuLoader } from "react-icons/lu";
import { updateUserWorkspaces } from "../actions/update-user-workspaces";
import {
  WorkspaceAccessSelector,
  type WorkspaceAccessRole,
} from "./WorkspaceAccessSelector";

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
  const [workspaceQuery, setWorkspaceQuery] = useState("");

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

    function updateRole(workspaceId: string, role: WorkspaceAccessRole) {
    setAssignments((current) =>
      current.map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  async function handleClearAssignments() {
    if (assignments.length === 0) {
      toast.info("No hay workspaces asignados para limpiar");
      return;
    }

    const result = await Swal.fire({
      title: "Limpiar workspaces",
      text: "Se quitaran todos los workspaces seleccionados. El cambio se aplicara cuando guardes permisos.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, limpiar",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#171717",
      confirmButtonColor: "#C2412D",
    });

    if (!result.isConfirmed) {
      return;
    }

    setAssignments([]);
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
          Selecciona las radios y el rol dentro de cada una.
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

      <div className="space-y-6 p-5">
        <WorkspaceAccessSelector
          workspaces={workspaces}
          assignments={assignments}
          query={workspaceQuery}
          onQueryChange={setWorkspaceQuery}
          onToggleWorkspace={toggleWorkspace}
          onRoleChange={updateRole}
          onClear={handleClearAssignments}
          workspaceDescription="Selecciona los workspaces que tendra acceso este usuario."
          emptySelectionDescription="Selecciona al menos uno para definir su rol."
        />
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
