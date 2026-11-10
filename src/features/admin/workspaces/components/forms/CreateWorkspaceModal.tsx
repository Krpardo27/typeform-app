"use client";

import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LuArrowLeft, LuArrowRight, LuCircleAlert, LuLoader, LuX } from "react-icons/lu";
import { templateFormOptions } from "../../../../../../config/radio-workspaces";

import { CreateWorkspaceSchema, type CreateWorkspaceInput } from "../../schemas/workspace.schema";
import { createWorkspaceAction } from "../../actions/create-workspaces-actions";

interface Props {
  onClose: () => void;
}

type FieldErrors = Partial<Record<keyof CreateWorkspaceInput, string>>;

const controlClassName = "min-h-12 w-full rounded-md border border-[#FF5C35]/35 bg-white px-3 py-3 text-base text-[#171717] outline-none transition-colors placeholder:text-[#767670] focus:border-[#FF5C35] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35] aria-invalid:border-[#B42318] aria-invalid:focus:outline-[#B42318] motion-reduce:transition-none";

export default function CreateWorkspaceModal({ onClose }: Props) {
  const router = useRouter();
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLSelectElement>(null);
  const pendingRequest = useRef(false);
  const [name, setName] = useState("");
  const [templateFormTypeformId, setTemplateFormTypeformId] = useState("");
  const [confirmation, setConfirmation] = useState<CreateWorkspaceInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTemplate = templateFormOptions.find(
    (option) => option.value === (confirmation?.templateFormTypeformId ?? templateFormTypeformId),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;

    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (confirmation) headingRef.current?.focus();
    else nameRef.current?.focus();
  }, [confirmation]);

  function requestClose() {
    if (!pendingRequest.current) onClose();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    setError("");

    if (!confirmation) {
      const result = CreateWorkspaceSchema.safeParse({
        name: name.trim(),
        templateFormTypeformId: templateFormTypeformId.trim(),
      });

      if (!result.success) {
        const errors: FieldErrors = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0];
          if (field === "name" || field === "templateFormTypeformId") {
            errors[field] ??= field === "templateFormTypeformId"
              ? "Selecciona una radio plantilla."
              : issue.message;
          }
        }
        setFieldErrors(errors);
        if (errors.name) nameRef.current?.focus();
        else templateRef.current?.focus();
        return;
      }

      setFieldErrors({});
      setName(result.data.name);
      setConfirmation(result.data);
      return;
    }

    pendingRequest.current = true;
    setLoading(true);

    try {
      const response = await createWorkspaceAction(confirmation);

      if (response?.errors?.length) {
        const message = response.errors.map((issue) => issue.message).join(" ");
        setError(message);
        toast.error(message);
        router.refresh();
        return;
      }

      if (!response?.success) {
        const message = "No recibimos una confirmación de creación. Revisa el listado antes de volver a intentarlo.";
        setError(message);
        toast.error(message);
        router.refresh();
        return;
      }

      const createdWorkspaceName = response.workspace?.name ?? confirmation.name;
      const defaultFormTitle =
        response.defaultForm?.title ??
        `Formulario base - ${createdWorkspaceName}`;
      const workspaceAdminPath = response.workspace?.typeformId
        ? `/admin/workspaces/${encodeURIComponent(response.workspace.typeformId)}`
        : "/admin/workspaces";

      toast.success("Workspace creado exitosamente", {
        description: `Se creó ${createdWorkspaceName} con el formulario base ${defaultFormTitle}.`,
      });

      onClose();
      router.push(workspaceAdminPath);
      router.refresh();
    } catch {
      const message = "No pudimos confirmar la creación. Revisa el listado antes de volver a intentarlo.";
      setError(message);
      toast.error(message);
      router.refresh();
    } finally {
      pendingRequest.current = false;
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          requestClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-md border border-[#FF5C35]/40 bg-white p-0 text-[#171717] backdrop:bg-[#171717]/40"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#FF5C35]/20 px-5 py-5 sm:px-7 sm:py-6">
        <div className="min-w-0">
          <h2 ref={headingRef} id={`${id}-title`} tabIndex={-1} className="text-xl leading-tight font-semibold tracking-tight outline-none sm:text-2xl">
            {confirmation ? "Confirmar creación" : "Crear workspace"}
          </h2>
          <p id={`${id}-description`} className="mt-2 text-sm leading-6 text-[#595954]">
            {confirmation
              ? "Revisa el nombre y la plantilla antes de continuar."
              : "Crea un espacio y copia el formulario base de una radio."}
          </p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          disabled={loading}
          aria-label="Cerrar creación de workspace"
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#595954] transition-colors hover:bg-[#FFF1EC] hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-40 motion-reduce:transition-none"
        >
          <LuX aria-hidden="true" className="size-5" />
        </button>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-7">
          {confirmation ? (
            <>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-sm text-[#595954]">Nombre del workspace</dt>
                  <dd className="mt-1.5 font-medium wrap-anywhere">{confirmation.name}</dd>
                </div>
                <div className="border-l-2 border-[#FF5C35]/50 pl-3">
                  <dt className="text-sm text-[#595954]">Plantilla de origen</dt>
                  <dd className="mt-1.5 font-medium">
                    {selectedTemplate?.label ?? "Formulario de Typeform"}
                    <span className="mt-1 block text-sm font-normal text-[#595954] wrap-anywhere">
                      ID: {confirmation.templateFormTypeformId}
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="text-md leading-5 text-[#595954]">
                Se creará un workspace en Typeform y se duplicará la plantilla elegida.
                El formulario original no se modificará.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor={`${id}-name`} className="block text-sm font-medium">Nombre del workspace</label>
                <input
                  ref={nameRef}
                  id={`${id}-name`}
                  name="name"
                  type="text"
                  maxLength={100}
                  autoComplete="off"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, name: undefined }));
                  }}
                  placeholder="Ej: Radio ADN · Concursos"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? `${id}-name-error` : undefined}
                  className={controlClassName}
                />
                {fieldErrors.name && <p id={`${id}-name-error`} role="alert" className="text-sm leading-5 text-[#9B231B]">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor={`${id}-template`} className="block text-sm font-medium">Radio plantilla</label>
                <select
                  ref={templateRef}
                  id={`${id}-template`}
                  name="templateFormTypeformId"
                  value={templateFormTypeformId}
                  onChange={(event) => {
                    setTemplateFormTypeformId(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, templateFormTypeformId: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.templateFormTypeformId)}
                  aria-describedby={`${id}-template-hint${fieldErrors.templateFormTypeformId ? ` ${id}-template-error` : ""}`}
                  className={controlClassName}
                >
                  <option value="">Selecciona una radio</option>
                  {templateFormOptions.map((option) => (
                    <option key={option.typeformId} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p id={`${id}-template-hint`} className="text-sm leading-5 text-[#595954] wrap-anywhere">
                  {selectedTemplate
                    ? `Se usará el formulario ${selectedTemplate.value} de ${selectedTemplate.label}.`
                    : "El nuevo workspace empezará con una copia de su formulario base."}
                </p>
                {fieldErrors.templateFormTypeformId && <p id={`${id}-template-error`} role="alert" className="text-sm leading-5 text-[#9B231B]">{fieldErrors.templateFormTypeformId}</p>}
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm leading-5 text-[#9B231B]">
              <p className="flex items-start gap-2">
                <LuCircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="wrap-anywhere">{error}</span>
              </p>
              <p className="mt-2">Si el workspace aparece en el listado, no repitas la creación.</p>
            </div>
          )}
          <p role="status" className={loading ? "text-sm leading-5 text-[#595954]" : "sr-only"}>
            {loading ? "Creando el workspace y copiando la plantilla. No cierres esta página." : ""}
          </p>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[#E8E8E6] px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={() => {
              if (pendingRequest.current) return;
              if (confirmation) {
                setConfirmation(null);
                setError("");
              } else requestClose();
            }}
            disabled={loading}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#D1D1CD] px-4 py-3 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-40 motion-reduce:transition-none"
          >
            {confirmation && <LuArrowLeft aria-hidden="true" className="size-4" />}
            {confirmation ? "Volver a editar" : "Cancelar"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FF5C35] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
          >
            {loading ? (
              <><LuLoader aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Creando…</>
            ) : confirmation ? "Crear workspace" : (
              <>Continuar<LuArrowRight aria-hidden="true" className="size-4 text-white" /></>
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
