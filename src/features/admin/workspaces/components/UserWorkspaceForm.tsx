"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { LuLoader } from "react-icons/lu";
import { updateUserWorkspaces } from "../actions/update-user-workspaces";

type Workspace = {
  id: string;
  name: string;
  typeformId: string;
};

type Props = {
  userId: string;
  workspaces: Workspace[];
  assignedWorkspaceIds: string[];
};

export function UserWorkspaceForm({
  userId,
  workspaces,
  assignedWorkspaceIds,
}: Props) {
  const [selectedIds, setSelectedIds] =
    useState<string[]>(assignedWorkspaceIds);

  const [isPending, startTransition] = useTransition();

  const initialSet = useMemo(
    () => new Set(assignedWorkspaceIds),
    [assignedWorkspaceIds],
  );

  const currentSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const hasChanges = useMemo(() => {
    if (initialSet.size !== currentSet.size) return true;

    for (const id of initialSet) {
      if (!currentSet.has(id)) return true;
    }

    return false;
  }, [initialSet, currentSet]);

  function toggleWorkspace(workspaceId: string) {
    setSelectedIds((current) =>
      current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId],
    );
  }

  function handleSubmit() {
    if (!hasChanges) {
      toast.info("No se detectaron cambios");
      return;
    }

    startTransition(async () => {
      const response = await updateUserWorkspaces({
        userId,
        workspaceIds: selectedIds,
      });

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

  const selectedCount = selectedIds.length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111113]">
      {/* HEADER */}
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">
          Workspaces autorizados
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Selecciona las radios o marcas que este usuario podrá ver.
        </p>

        <div className="mt-3 inline-flex rounded-md border border-[#C8A96E]/30 bg-[#C8A96E]/10 px-3 py-1 text-sm text-[#C8A96E]">
          {selectedCount} workspace{selectedCount !== 1 ? "s" : ""} asignado
          {selectedCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* GRID */}
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => {
          const checked = selectedIds.includes(workspace.id);

          return (
            <label
              key={workspace.id}
              className={`cursor-pointer rounded-xl border p-4 transition
                ${
                  checked
                    ? "border-[#C8A96E] bg-[#C8A96E]/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={`truncate font-medium ${
                      checked ? "text-[#C8A96E]" : "text-white"
                    }`}
                  >
                    {workspace.name}
                  </h3>

                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {workspace.typeformId}
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleWorkspace(workspace.id)}
                  className="mt-1 size-4 accent-[#C8A96E]"
                />
              </div>
            </label>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-4">
        <p className="text-xs text-zinc-500">
          {hasChanges ? "Tienes cambios sin guardar" : "Sin cambios pendientes"}
        </p>

        <button
          type="button"
          disabled={isPending || !hasChanges}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-lg bg-[#C8A96E] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b979] disabled:opacity-50"
        >
          {isPending && <LuLoader className="size-4 animate-spin" />}

          {isPending ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>
    </div>
  );
}
