"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuLoader, LuUserMinus } from "react-icons/lu";
import { revokeMember } from "../actions/revoke-member.action";

type Props = {
  email: string;
};

export function RevokeMemberButton({ email }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      const confirmation = await Swal.fire({
        title: "Revocar miembro",
        text: `Se quitara ${email} de whitelist, de todos sus workspaces y se cerraran sus sesiones activas.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Si, revocar",
        cancelButtonText: "Cancelar",
        background: "#111113",
        color: "#f4f4f5",
        confirmButtonColor: "#ef4444",
      });

      if (!confirmation.isConfirmed) {
        return;
      }

      const result = await revokeMember(email);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleRevoke}
      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
    >
      {isPending ? <LuLoader className="size-3.5 animate-spin" /> : <LuUserMinus className="size-3.5" />}
      Revocar
    </button>
  );
}