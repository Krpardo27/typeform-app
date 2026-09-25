"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuCheck, LuLoader, LuUserPlus } from "react-icons/lu";
import {
  WorkspaceAccessSelector,
  type WorkspaceAccessAssignment,
  type WorkspaceAccessRole,
} from "@/features/admin/workspaces/components/WorkspaceAccessSelector";
import { authorizeMemberBatch } from "../actions/authorize-member.action";

type WorkspaceOption = {
  id: string;
  name: string;
  typeformId: string;
};

type Props = {
  workspaces: WorkspaceOption[];
};

export function AuthorizeMemberForm({ workspaces }: Props) {
  const [email, setEmail] = useState("");
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [assignments, setAssignments] = useState<WorkspaceAccessAssignment[]>([]);
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

  function updateRole(workspaceId: string, role: WorkspaceAccessRole) {
    setAssignments((current) =>
      current.map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  const canSubmit = Boolean(email.trim()) && assignments.length > 0;

  function clearAssignments() {
    setAssignments([]);
  }

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
      const result = await authorizeMemberBatch({
        email,
        assignments,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setEmail("");
      setWorkspaceQuery("");
      setAssignments([]);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm"
    >
      <div className="border-b border-[#E5E5E5] bg-[#F8F8F7] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#18181B] text-white">
              <LuUserPlus className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#171717]">
                Autorizar miembro
              </h2>
              <p className="text-xs text-[#737373]">
                Asigna acceso a workspaces creados desde la app.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#737373]">
            {assignments.length} seleccionado{assignments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#737373]">
            Email del miembro
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@prisamedia.com"
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm text-[#171717] outline-none transition focus:border-[#18181B] focus:bg-white focus:ring-2 focus:ring-[#18181B]/10"
            required
          />
        </label>

        <WorkspaceAccessSelector
          workspaces={workspaces}
          assignments={assignments}
          query={workspaceQuery}
          onQueryChange={setWorkspaceQuery}
          onToggleWorkspace={toggleWorkspace}
          onRoleChange={updateRole}
          onClear={clearAssignments}
          workspaceDescription="Selecciona uno o mas accesos para este usuario."
          emptySelectionDescription="Selecciona al menos uno para definir su rol."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5E5] bg-[#F8F8F7] px-5 py-4 sm:px-6">
        <p className="text-xs text-[#737373]">
          {canSubmit
            ? `Listo para autorizar ${assignments.length} workspace${assignments.length !== 1 ? "s" : ""}.`
            : "Completa el email y selecciona al menos un workspace."}
        </p>

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#18181B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-50"
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
