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

const TEMPLATE_FORM_OPTIONS = [
  {
    label: "CONCIERTO",
    typeformId: "1530584",
    value: "HePVkesf",
  },
  {
    label: "LOS40",
    typeformId: "416594",
    value: "pirygCQR",
  },
  {
    label: "ROCKANDPOP",
    typeformId: "414850",
    value: "VxoT54si",
  },
  {
    label: "FUTURO",
    typeformId: "371901",
    value: "r1aIO4Xh",
  },
  {
    label: "ADN",
    typeformId: "2828888",
    value: "yuXGlh4N",
  },
  {
    label: "FMDOS",
    typeformId: "282794",
    value: "pkgiqZ1g",
  },
  {
    label: "ACTIVA",
    typeformId: "866034",
    value: "E9T1RItE",
  },
  {
    label: "CORAZÓN",
    typeformId: "4110099",
    value: "l5cL82so",
  },
  {
    label: "PUDAHUEL",
    typeformId: "390974",
    value: "Id8OdFJO",
  },
  {
    label: "IMAGINA",
    typeformId: "2979562",
    value: "cQ5BsMcs",
  },
] as const;

export default function CreateWorkspaceModal({ onClose }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [templateFormTypeformId, setTemplateFormTypeformId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = async (e) => {
    e.preventDefault();

    setError("");

    const result = CreateWorkspaceSchema.safeParse({
      name,
      templateFormTypeformId,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    const workspaceName = result.data.name;
    const workspaceTemplateFormTypeformId = result.data.templateFormTypeformId;
    const confirmation = await Swal.fire({
      title: "Crear workspace",
      text: `Se creara el workspace "${workspaceName}" y se duplicara el formulario base configurado.`,
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

    const response = await createWorkspaceAction({
      name: workspaceName,
      templateFormTypeformId: workspaceTemplateFormTypeformId,
    });

    setLoading(false);

    if (response?.errors) {
      response.errors.forEach((issue) => toast.error(issue.message));
      return;
    }

    if (response?.success) {
      const createdWorkspaceName = response.workspace?.name ?? workspaceName;
      const defaultFormTitle =
        response.defaultForm?.title ??
        `Formulario base - ${createdWorkspaceName}`;
      const workspaceAdminPath = response.workspace?.typeformId
        ? `/admin/workspaces/${response.workspace.typeformId}`
        : "/admin/workspaces";

      toast.success("Workspace creado exitosamente", {
        description: `Se creo ${createdWorkspaceName} con el formulario base ${defaultFormTitle}.`,
      });

      onClose();
      router.push(workspaceAdminPath);
      router.refresh();
      return;
    } else {
      toast.success("Workspace creado exitosamente");
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex p-4 lg:p-0 items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#171717]">
            Crear workspace
          </h2>

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
              className="w-full rounded-lg border border-gray-400 bg-[#F5F5F5] px-3 py-2.5 text-sm text-[#171717] placeholder-[#737373] outline-none transition focus:border-[#18181B] disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Radio plantilla
            </label>

            <select
              value={templateFormTypeformId}
              onChange={(e) => {
                setTemplateFormTypeformId(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              disabled={loading}
              className="w-full rounded-lg border border-gray-400 bg-[#F5F5F5] px-3 py-2.5 text-sm text-[#171717] placeholder-[#737373] outline-none transition focus:border-[#18181B] disabled:opacity-50"
            >
              <option value="">Selecciona una radio base</option>

              {TEMPLATE_FORM_OPTIONS.map((option) => (
                <option key={option.typeformId} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && <FormErrors>{error}</FormErrors>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-400 text-white border border-[#E5E5E5] py-2.5 text-sm  transition hover:border-[#18181B] hover:text-[#171717] disabled:opacity-50"
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
