"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LuChevronLeft, LuChevronRight, LuLoader, LuX } from "react-icons/lu";
import { ParticipantContact } from "../ParticipantContact";
import { ResponseExportButton } from "../ResponseExportButton";
import type {
  WinnerDetailResult,
  WinnerRevealGrant,
  WinnerViewParticipant,
  ReadWinnerData,
} from "@/features/typeform/types/winner-reveal";

type Props = {
  grant: WinnerRevealGrant;
  participants: WinnerViewParticipant[];
  initialToken: string;
  readData: ReadWinnerData;
  onClose: () => void;
  selectionFormRef: RefObject<HTMLFormElement | null>;
  exportBaseHref?: string;
};

function dateLabel(value?: string) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? `${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date)} UTC`
    : "Sin fecha informada";
}

function answerFieldLabel(
  answer: { fieldLabel?: string; question: string },
  index: number,
) {
  for (const value of [answer.fieldLabel, answer.question]) {
    const label = value?.trim().replace(/\s+/g, " ");
    if (
      !label ||
      label.length > 300 ||
      /[<>_{}@=\\]/.test(label) ||
      /https?:|\b(?:field|ref|id|question|answer)[-_:]|[a-f\d]{12,}|\S-\S/i.test(
        label,
      ) ||
      /[a-záéíóúñ][A-ZÁÉÍÓÚÑ]/.test(label)
    )
      continue;
    if (
      !/\s/.test(label) &&
      !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[:?]?$/.test(label) &&
      !/^(?:nombre|nombres|apellido|apellidos|rut:?|email|correo|teléfono|telefono|región|region|comuna|ciudad)$/i.test(
        label,
      )
    )
      continue;
    return label;
  }
  return `Respuesta ${index + 1}`;
}

export function WinnerDataDialog({
  grant,
  participants,
  initialToken,
  readData,
  onClose,
  selectionFormRef,
  exportBaseHref,
}: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      participants.findIndex(
        (participant) => participant.token === initialToken,
      ),
    ),
  );
  const participant = participants[index];
  const requestKey = `${grant?.flowToken ?? ""}:${grant?.expiresAt ?? ""}:${participant?.token ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    result: WinnerDetailResult;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const loadedResult = loaded?.key === requestKey ? loaded.result : null;
  const expiresAt = Math.min(
    Date.parse(grant?.expiresAt ?? ""),
    loadedResult?.status === "revealed"
      ? Date.parse(loadedResult.expiresAt)
      : Infinity,
  );
  const grantValid =
    Boolean(grant?.flowToken.trim()) &&
    Number.isFinite(expiresAt) &&
    now < expiresAt;
  const result: WinnerDetailResult | null = grantValid
    ? loadedResult
    : {
        status: "denied",
        message: "El permiso para consultar estos datos ha caducado.",
      };

  useEffect(() => {
    if (!Number.isFinite(expiresAt)) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const selectionForm = selectionFormRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
      else if (selectionForm?.isConnected)
        selectionForm
          ?.querySelector<HTMLButtonElement>('button[type="submit"]')
          ?.focus({ preventScroll: true });
    };
  }, [selectionFormRef]);

  useEffect(() => {
    if (
      !participant ||
      !grant?.flowToken.trim() ||
      !Number.isFinite(Date.parse(grant.expiresAt)) ||
      Date.now() >= Date.parse(grant.expiresAt)
    )
      return;
    let current = true;
    readData(grant.flowToken, participant.token)
      .then((next) => {
        if (!current || Date.now() >= Date.parse(grant.expiresAt)) return;
        const valid =
          next.status !== "revealed" ||
          (next.response.visibility === "winner" &&
            next.response.token === participant.token &&
            Number.isFinite(Date.parse(next.expiresAt)) &&
            Date.now() < Date.parse(next.expiresAt));
        setLoaded({
          key: requestKey,
          result: valid
            ? next
            : {
                status: "denied",
                message: "No se pudo verificar el detalle del participante.",
              },
        });
      })
      .catch(() => {
        if (current)
          setLoaded({
            key: requestKey,
            result: {
              status: "denied",
              message:
                "No se pudo consultar el detalle. Ciérralo y vuelve a intentarlo.",
            },
          });
      });
    return () => {
      current = false;
    };
  }, [grant, participant, readData, requestKey]);

  if (typeof document === "undefined" || !participant) return null;
  const response = result?.status === "revealed" ? result.response : null;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-busy={!result}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-md border border-[#D1D1CD] bg-white p-0 text-[#171717] backdrop:bg-[#171717]/40 sm:max-h-[calc(100dvh-3rem)]"
    >
      <header className="sticky top-0 z-10 flex justify-end border-b border-[#E5E5E5] bg-white px-2 py-1 sm:px-3">
        <h2 id={`${id}-title`} className="sr-only">
          Datos del ganador
        </h2>
        <button
          ref={closeRef}
          type="button"
          aria-label="Cerrar datos del ganador"
          onClick={onClose}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#595954] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116]"
        >
          <LuX aria-hidden="true" className="size-5" />
        </button>
      </header>
      <div className="space-y-5 p-4 sm:p-6">
        {!result && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-[#595954]"
          >
            <LuLoader
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Consultando datos autorizados…
          </p>
        )}
        {result?.status === "denied" && (
          <p role="alert" className="text-sm leading-6 text-[#9B231B]">
            {result.message}
          </p>
        )}
        {response && (
          <>
            <dl className="grid min-w-0 gap-4 text-sm leading-6 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-[#737373]">Contacto</dt>
                <dd className="font-medium wrap-anywhere">
                  <ParticipantContact
                    response={{ ...response, hidden: [] }}
                    contactOverride={
                      result?.status === "revealed" ? result.contact : undefined
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-[#737373]">Enviado</dt>
                <dd>{dateLabel(response.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-[#737373]">Inicio del formulario</dt>
                <dd>{dateLabel(response.landedAt)}</dd>
              </div>
            </dl>
            {[
              {
                title: "Respuestas del participante",
                answers: response.answers,
              },
            ].map((section) => (
              <section
                key={section.title}
                className="min-w-0 rounded-md border border-[#E8E8E6]"
              >
                <h3 className="border-b border-[#E8E8E6] px-4 py-3 text-sm font-semibold">
                  {section.title}
                </h3>
                {section.answers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#595954]">
                    Sin datos registrados.
                  </p>
                ) : (
                  <dl>
                    {section.answers.map((answer, index) => (
                      <div
                        key={answer.id}
                        className="grid min-w-0 gap-1 border-b border-[#E8E8E6] px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4"
                      >
                        <dt className="min-w-0 text-sm leading-6 text-[#737373] wrap-anywhere">
                          {answerFieldLabel(answer, index)}
                        </dt>
                        <dd className="min-w-0 whitespace-pre-wrap text-sm leading-6 wrap-anywhere">
                          {answer.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            ))}
            {exportBaseHref && (
              <ResponseExportButton
                baseHref={exportBaseHref}
                scope="winners"
                label="Exportar selección confirmada"
                variant="winners"
                canExport
                winnerFlowToken={grant.flowToken}
              />
            )}
          </>
        )}
      </div>
      {participants.length > 1 && (
        <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#E5E5E5] bg-white p-4 sm:px-6">
          <button
            type="button"
            aria-label="Ganador anterior"
            disabled={index === 0}
            onClick={() => setIndex((current) => current - 1)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-[#D1D1CD] focus-visible:outline-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-40"
          >
            <LuChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <span className="text-sm text-[#595954]">
            Ganador {index + 1} de {participants.length}
          </span>
          <button
            type="button"
            aria-label="Ganador siguiente"
            disabled={index === participants.length - 1}
            onClick={() => setIndex((current) => current + 1)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-[#D1D1CD] focus-visible:outline-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-40"
          >
            <LuChevronRight aria-hidden="true" className="size-4" />
          </button>
        </footer>
      )}
    </dialog>,
    document.body,
  );
}
