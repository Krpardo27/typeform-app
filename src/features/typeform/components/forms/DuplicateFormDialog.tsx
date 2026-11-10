"use client";

import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import { createPortal } from "react-dom";
import { LuCircleAlert, LuLoader, LuX } from "react-icons/lu";
import type { DuplicateFormResult } from "@/features/typeform/types/duplicate-form";

export type DuplicateFormRecovery = { createdFormId: string; title: string };

export type DuplicateFormDialogProps = {
  initialTitle: string;
  initialRecovery: DuplicateFormRecovery | null;
  initialUncertain: boolean;
  onSubmit: (title: string, allowSameTitle: boolean) => Promise<DuplicateFormResult>;
  onClose: () => void;
};

type NameConflict = Extract<DuplicateFormResult, { status: "name-conflict" }>;

const controlClassName = "min-h-12 w-full rounded-md border border-[#FF5C35]/35 bg-white px-3 py-3 text-base text-[#171717] outline-none transition-colors placeholder:text-[#767670] focus:border-[#FF5C35] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35] aria-invalid:border-[#B42318] aria-invalid:focus:outline-[#B42318] read-only:border-[#D1D1CD] read-only:bg-[#F5F5F3] read-only:text-[#595954] motion-reduce:transition-none";
const checkboxClassName = "size-4 shrink-0 accent-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]";

export default function DuplicateFormDialog({
  initialTitle,
  initialRecovery,
  initialUncertain,
  onSubmit,
  onClose,
}: DuplicateFormDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const warningRef = useRef<HTMLDivElement>(null);
  const pendingRequest = useRef(false);
  const [title, setTitle] = useState(initialRecovery?.title ?? initialTitle);
  const [recovery, setRecovery] = useState(initialRecovery);
  const [uncertain, setUncertain] = useState(initialUncertain);
  const [uncertainAcknowledged, setUncertainAcknowledged] = useState(false);
  const [conflict, setConflict] = useState<NameConflict | null>(null);
  const [sameTitleAcknowledged, setSameTitleAcknowledged] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [pending, setPending] = useState(false);

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
    if (recovery || conflict || uncertain) warningRef.current?.focus();
    else inputRef.current?.focus();
  }, [recovery, conflict, uncertain]);

  function requestClose() {
    if (!pendingRequest.current) onClose();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    if (!recovery && uncertain && !uncertainAcknowledged) return;
    if (!recovery && conflict && !sameTitleAcknowledged) return;

    const trimmedTitle = (recovery?.title ?? title).trim();
    if (!trimmedTitle) {
      setFieldError("Ingresa un nombre para el formulario duplicado.");
      inputRef.current?.focus();
      return;
    }

    pendingRequest.current = true;
    setPending(true);
    setTitle(trimmedTitle);
    setFieldError("");
    setError("");
    const allowSameTitle = !recovery && Boolean(conflict?.matches.length) && sameTitleAcknowledged;
    if (!recovery) {
      setUncertain(false);
      setUncertainAcknowledged(false);
    }
    let succeeded = false;

    try {
      const result = await onSubmit(trimmedTitle, allowSameTitle);
      switch (result.status) {
        case "success":
          // El padre cierra el diálogo al terminar la navegación. No liberar el envío.
          succeeded = true;
          break;
        case "partial":
          setRecovery({ createdFormId: result.createdFormId, title: result.title });
          setTitle(result.title);
          setRecoveryMessage(result.message);
          setConflict(null);
          setSameTitleAcknowledged(false);
          setUncertain(false);
          setUncertainAcknowledged(false);
          break;
        case "name-conflict":
          if (recovery) {
            setError("La copia ya existe. No se pudo completar su registro. Puedes reintentarlo sin crear otra copia.");
          } else {
            setConflict(result);
            setSameTitleAcknowledged(false);
          }
          break;
        case "failed":
          setError(result.message);
          if (!recovery && !result.retrySafe) {
            setUncertain(true);
            setUncertainAcknowledged(false);
          }
          break;
      }
    } catch {
      if (recovery) {
        setError(`La copia ${recovery.createdFormId} ya existe. No se pudo completar su registro. Puedes reintentarlo sin crear otra copia.`);
      } else {
        setUncertain(true);
        setUncertainAcknowledged(false);
        setError("No pudimos confirmar la creación. Revisa el listado antes de decidir si quieres crear otra copia.");
      }
    } finally {
      if (!succeeded) {
        pendingRequest.current = false;
        setPending(false);
      }
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={pending}
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
            {recovery ? "Completar registro de la copia" : "Duplicar formulario"}
          </h2>
          <p id={`${id}-description`} className="mt-2 text-sm leading-6 text-[#595954]">
            {recovery
              ? "Solo se completará el registro de la copia en la aplicación. No se creará otro formulario."
              : "Puedes ajustar el nombre antes de crear la copia. El original no se modifica."}
          </p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          disabled={pending}
          aria-label="Cerrar duplicación de formulario"
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#595954] transition-colors hover:bg-[#FFF1EC] hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-40 motion-reduce:transition-none"
        >
          <LuX aria-hidden="true" className="size-5" />
        </button>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-7">
          <div className="space-y-2">
            <label htmlFor={`${id}-name`} className="block text-sm font-medium">Nombre del formulario</label>
            <input
              ref={inputRef}
              id={`${id}-name`}
              name="title"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              value={title}
              readOnly={Boolean(recovery)}
              disabled={pending}
              onChange={(event) => {
                if (pendingRequest.current || recovery) return;
                setTitle(event.target.value);
                setConflict(null);
                setSameTitleAcknowledged(false);
                setUncertainAcknowledged(false);
                setFieldError("");
                setError("");
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={`${id}-name-help${fieldError ? ` ${id}-name-error` : ""}`}
              className={controlClassName}
            />
            <p id={`${id}-name-help`} className="text-sm leading-5 text-[#595954]">
              {recovery ? "El nombre corresponde a la copia existente y no se puede editar aquí." : "Se comprobará si ya existe un formulario con este nombre antes de crear la copia."}
            </p>
            {fieldError && <p id={`${id}-name-error`} role="alert" className="text-sm leading-5 text-[#9B231B]">{fieldError}</p>}
          </div>

          {recovery ? (
            <div ref={warningRef} tabIndex={-1} role="status" className="border-l-2 border-[#FF5C35]/50 bg-[#FFF1EC] px-3 py-3 text-sm leading-6 outline-none focus-visible:outline-2 focus-visible:outline-[#FF5C35]">
              <p className="flex items-start gap-2 font-medium">
                <LuCircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />La copia ya existe en Typeform
              </p>
              <p className="mt-2 wrap-anywhere">ID: {recovery.createdFormId}</p>
              <p className="mt-2">El siguiente intento solo guardará su registro en la aplicación; no creará otra copia.</p>
              {recoveryMessage && <p className="mt-2 wrap-anywhere">{recoveryMessage}</p>}
            </div>
          ) : (
            <>
              {uncertain && (
                <div ref={warningRef} tabIndex={-1} role="status" className="border-l-2 border-[#FF5C35]/50 bg-[#FFF1EC] px-3 py-3 text-sm leading-6 outline-none focus-visible:outline-2 focus-visible:outline-[#FF5C35]">
                  <p className="flex items-start gap-2 font-medium">
                    <LuCircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />Revisa el listado antes de repetir
                  </p>
                  <p className="mt-2">La solicitud anterior no pudo confirmarse. Puede existir una copia en Typeform. Revisa el listado antes de crear otra.</p>
                  <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" checked={uncertainAcknowledged} disabled={pending} onChange={(event) => setUncertainAcknowledged(event.target.checked)} className={checkboxClassName} />
                    <span>Ya revisé el listado y quiero crear otra copia</span>
                  </label>
                </div>
              )}
              {conflict && (
                <div ref={uncertain ? undefined : warningRef} tabIndex={-1} role="status" className="border-l-2 border-[#FF5C35]/50 bg-[#FFF1EC] px-3 py-3 text-sm leading-6 outline-none focus-visible:outline-2 focus-visible:outline-[#FF5C35]">
                  <h3 className="flex items-start gap-2 font-medium">
                    <LuCircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />Ya existe un formulario con este nombre
                  </h3>
                  <p className="mt-2 wrap-anywhere">{conflict.message}</p>
                  <ul aria-label="Formularios con el mismo nombre" tabIndex={0} className="mt-3 max-h-40 space-y-3 overflow-y-auto border-y border-[#FF5C35]/20 py-3 focus-visible:outline-2 focus-visible:outline-[#FF5C35]">
                    {conflict.matches.map((match) => (
                      <li key={match.id} className="wrap-anywhere">
                        <p className="font-medium">{match.title}</p>
                        <p className="text-sm text-[#595954]">ID: {match.id}</p>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" checked={sameTitleAcknowledged} disabled={pending} onChange={(event) => setSameTitleAcknowledged(event.target.checked)} className={checkboxClassName} />
                    <span>Crear otra copia con el mismo nombre</span>
                  </label>
                </div>
              )}
            </>
          )}

          {error && (
            <div role="alert" className="border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm leading-5 text-[#9B231B]">
              <p className="flex items-start gap-2">
                <LuCircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="wrap-anywhere">{error}</span>
              </p>
            </div>
          )}
          <p role="status" className={pending ? "text-sm leading-5 text-[#595954]" : "sr-only"}>
            {pending ? recovery ? "Completando el registro. No cierres esta página." : "Procesando la solicitud. No cierres esta página." : ""}
          </p>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[#E8E8E6] px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={requestClose} disabled={pending} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#D1D1CD] px-4 py-3 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-40 motion-reduce:transition-none">
            {recovery || uncertain ? "Cerrar y revisar listado" : "Cancelar"}
          </button>
          <button
            type="submit"
            disabled={pending || (!recovery && ((uncertain && !uncertainAcknowledged) || (Boolean(conflict) && !sameTitleAcknowledged)))}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FF5C35] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {pending && <LuLoader aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
            {recovery ? "Completar registro" : pending ? "Procesando…" : "Duplicar"}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}