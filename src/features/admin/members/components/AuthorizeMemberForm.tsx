"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuLoader, LuUserPlus, LuCheck } from "react-icons/lu";
import { authorizeMember } from "../actions/authorize-member.action";

type WorkspaceOption = {
  id: string;
  name: string;
  typeformId: string;
};

type Props = {
  workspaces: WorkspaceOption[];
};

type WorkspaceAssignment = {
  workspaceId: string;
  role: "VIEWER" | "EDITOR";
};

export function AuthorizeMemberForm({ workspaces }: Props) {
  const [email, setEmail] = useState("");
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleWorkspace(workspaceId: string) {
    setAssignments((current) => {
      const exists = current.some((item) => item.workspaceId === workspaceId);
      if (exists) {
        return current.filter((item) => item.workspaceId !== workspaceId);
      }
      return [...current, { workspaceId, role: "VIEWER" }];
    });
  }

  function updateRole(workspaceId: string, role: "VIEWER" | "EDITOR") {
    setAssignments((current) =>
      current.map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  const canSubmit = Boolean(email.trim()) && assignments.length > 0;

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Completa email y selecciona al menos 1 workspace");
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
      title: "Autorizar miembro",
      text:
        assignments.length > 3
          ? `${email}\n${selectedPreview}\n... y ${assignments.length - 3} workspace(s) mas.`
          : `${email}\n${selectedPreview}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, autorizar",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#171717",
      confirmButtonColor: "#18181B",
    });

    if (!result.isConfirmed) {
      return;
    }

    startTransition(async () => {
      for (const assignment of assignments) {
        const result = await authorizeMember({
          email,
          workspaceId: assignment.workspaceId,
          role: assignment.role,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }
      }

      toast.success(
        `${email} autorizado en ${assignments.length} workspace(s)`,
      );
      setEmail("");
      setAssignments([]);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 space-y-4"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#171717]">
        <LuUserPlus className="size-4 text-[#18181B]" />
        Autorizar miembro
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-[#737373]">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="pepito@empresa.com"
          className="w-full rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#18181B]"
          required
        />
      </label>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-[#737373]">
            Workspaces
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
            Selecciona uno o más workspaces. Usa Ctrl+Click para
            multi-selección.
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
                          event.target.value as "VIEWER" | "EDITOR",
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

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="inline-flex items-center cursor-pointer gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <LuLoader className="size-4 animate-spin" />
              Autorizando...
            </>
          ) : (
            <>
              <LuCheck className="size-4" />
              Autorizar en {assignments.length} workspace
              {assignments.length !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
