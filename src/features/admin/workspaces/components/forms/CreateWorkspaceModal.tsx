"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { LuX, LuLoader } from "react-icons/lu";

import FormErrors from "./FormErrors";
import { CreateWorkspaceSchema } from "../../schemas/workspace.schema";
import { createWorkspaceAction } from "../../actions/create-workspaces-actions";
import Form from "./Form";

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

    const workspaceName = result.data.name;
    const confirmation = await Swal.fire({
      title: "Crear workspace",
      text: `Se creara el workspace "${workspaceName}" y su formulario base.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, crear",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#171717",
      confirmButtonColor: "#18181B",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);

    const response = await createWorkspaceAction({ name: workspaceName });

    setLoading(false);

    if (response?.errors) {
      response.errors.forEach((issue) => toast.error(issue.message));
      return;
    }

    if (response?.success) {
      const createdWorkspaceName = response.workspace?.name ?? workspaceName;
      const defaultFormTitle =
        response.defaultForm?.title ?? `Formulario base - ${createdWorkspaceName}`;
      const workspaceAdminPath = response.workspace?.typeformId
        ? `/admin/workspaces/${response.workspace.typeformId}`
        : "/admin/workspaces";

      toast.success("Workspace creado exitosamente", {
        description: `Se creo ${createdWorkspaceName} con el formulario base ${defaultFormTitle}.`,
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
      <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#171717]">Crear workspace</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 cursor-pointer text-[#737373] transition hover:bg-[#F5F5F5] hover:text-[#171717]"
          >
            <LuX className="size-4" />
          </button>
        </div>

        {/* Form */}
        <Form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#737373]">
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
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2.5 text-sm text-[#171717] placeholder-[#737373] outline-none transition focus:border-[#18181B] disabled:opacity-50"
            />

            {error && <FormErrors>{error}</FormErrors>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-[#E5E5E5] py-2.5 text-sm text-[#737373] transition hover:border-[#18181B] hover:text-[#171717] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#18181B] py-2.5 text-sm font-medium text-white transition hover:bg-[#27272A] disabled:opacity-50"
            >
              {loading && <LuLoader className="size-4 animate-spin" />}

              {loading ? "Creando..." : "Crear workspace"}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
