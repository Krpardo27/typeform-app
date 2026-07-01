"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LuX, LuLoader } from "react-icons/lu";

import FormErrors from "./FormErrors";
import { CreateWorkspaceSchema } from "../../schemas/workspace.schema";
import { createWorkspaceAction } from "../../actions/create-workspaces-actions";

interface Props {
  onClose: () => void;
}

export default function CreateWorkspaceModal({ onClose }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> = async (e) => {
    e.preventDefault();

    setError("");

    const result = CreateWorkspaceSchema.safeParse({ name });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);

    const response = await createWorkspaceAction({ name });

    setLoading(false);

    if (response?.errors) {
      response.errors.forEach((issue) => toast.error(issue.message));
      return;
    }

    if (response?.success) {
      const workspaceName = response.workspace?.name ?? name;
      const defaultFormTitle =
        response.defaultForm?.title ?? `Formulario base - ${workspaceName}`;
      const workspaceAdminPath = response.workspace?.typeformId
        ? `/admin/workspaces/${response.workspace.typeformId}`
        : "/admin/workspaces";

      toast.success("Workspace creado exitosamente", {
        description: `Se creo ${workspaceName} con el formulario base ${defaultFormTitle}.`,
        action: {
          label: "Abrir",
          onClick: () => router.push(workspaceAdminPath),
        },
      });
    } else {
      toast.success("Workspace creado exitosamente");
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#111113] p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Crear workspace</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
          >
            <LuX className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Nombre del workspace
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Ej: Radio ADN"
              disabled={loading}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#C8A96E] disabled:opacity-50"
            />

            {error && <FormErrors>{error}</FormErrors>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#C8A96E] py-2.5 text-sm font-medium text-black transition hover:bg-[#d4b87a] disabled:opacity-50"
            >
              {loading && <LuLoader className="size-4 animate-spin" />}

              {loading ? "Creando..." : "Crear workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
