"use client";

import { useEffect, useId, useRef, useState, useTransition, type SubmitEvent } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCircleAlert, LuLoader } from "react-icons/lu";
import {
  WorkspaceAccessSelector,
  type WorkspaceAccessAssignment,
  type WorkspaceAccessOption,
  type WorkspaceAccessRole,
} from "@/features/admin/workspaces/components/WorkspaceAccessSelector";
import { authorizeMemberBatch } from "../actions/authorize-member.action";
import { authorizeMemberSchema, type AuthorizeMemberInput } from "../schemas/authorize-member.schema";

type Props = {
  workspaces: WorkspaceAccessOption[];
};

export function AuthorizeMemberForm({ workspaces }: Props) {
  const router = useRouter();
  const id = useId();
  const pendingRequest = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const wasReviewing = useRef(false);
  const [email, setEmail] = useState("");
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [assignments, setAssignments] = useState<WorkspaceAccessAssignment[]>([]);
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<AuthorizeMemberInput | null>(null);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const availableWorkspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const availableAssignments = assignments.filter((assignment) => availableWorkspaceIds.has(assignment.workspaceId));
  const hasUnavailableAssignments = availableAssignments.length !== assignments.length;
  const displayedError = error || (hasUnavailableAssignments
    ? "Uno o más workspaces seleccionados ya no están disponibles. Revisa los accesos restantes antes de continuar."
    : "");

  useEffect(() => {
    if (confirmation && !wasReviewing.current) {
      wasReviewing.current = true;
      confirmationRef.current?.focus();
    } else if (!confirmation && wasReviewing.current && !isPending) {
      wasReviewing.current = false;
      emailRef.current?.focus();
    }
  }, [confirmation, isPending]);

  function clearFeedback() {
    setError("");
    setSuccess("");
  }

  function toggleWorkspace(workspaceId: string) {
    if (pendingRequest.current || isPending || confirmation || !availableWorkspaceIds.has(workspaceId)) return;
    clearFeedback();
    setAssignments((current) => {
      const available = current.filter((item) => availableWorkspaceIds.has(item.workspaceId));
      const exists = available.some((item) => item.workspaceId === workspaceId);
      if (exists) {
        return available.filter((item) => item.workspaceId !== workspaceId);
      }
      return [...available, { workspaceId, role: "VIEWER" }];
    });
  }

  function updateRole(workspaceId: string, role: WorkspaceAccessRole) {
    if (pendingRequest.current || isPending || confirmation) return;
    clearFeedback();
    setAssignments((current) =>
      current.filter((item) => availableWorkspaceIds.has(item.workspaceId)).map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  function clearAssignments() {
    if (pendingRequest.current || isPending || confirmation) return;
    clearFeedback();
    setAssignments([]);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current || isPending) return;
    const intent = event.nativeEvent.submitter?.getAttribute("value");
    if ((confirmation && intent !== "confirm") || (!confirmation && intent === "confirm")) return;
    clearFeedback();

    // Validar el borrador o el snapshot revisado contra las props actuales.
    const parsed = authorizeMemberSchema.safeParse(confirmation ?? { email, assignments });
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === "email");
      setEmailError(emailIssue?.message ?? "");
      setError(parsed.error.issues.find((issue) => issue.path[0] !== "email")?.message ?? "");
      setConfirmation(null);
      if (emailIssue) emailRef.current?.focus();
      return;
    }

    const validAssignments = parsed.data.assignments.filter((assignment) => availableWorkspaceIds.has(assignment.workspaceId));
    if (validAssignments.length !== parsed.data.assignments.length) {
      setAssignments(validAssignments);
      setConfirmation(null);
      setError("La lista de workspaces cambió. Se conservaron los accesos disponibles; revisa la selección antes de continuar.");
      return;
    }

    if (!confirmation) {
      setEmailError("");
      setEmail(parsed.data.email);
      setConfirmation(parsed.data);
      return;
    }

    const payload = parsed.data;
    pendingRequest.current = true;
    startTransition(async () => {
      try {
        const result = await authorizeMemberBatch(payload);
        if (!result.success) {
          setError(result.message);
          toast.error(result.message);
          return;
        }

        setSuccess(result.message);
        toast.success(result.message);
        setEmail("");
        setEmailError("");
        setWorkspaceQuery("");
        setAssignments([]);
        setConfirmation(null);
        router.refresh();
      } catch (caught) {
        unstable_rethrow(caught);
        const message = "No pudimos confirmar la autorización. Revisa los accesos del miembro antes de volver a intentarlo.";
        setError(message);
        toast.error(message);
        router.refresh();
      } finally {
        pendingRequest.current = false;
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isPending}
      aria-labelledby={`${id}-title`}
      className="relative min-w-0 overflow-hidden rounded-md border border-[#FF5C35]/35 bg-white text-[#171717]"
    >
      <div className="border-b border-[#FF5C35]/20 px-5 py-5 sm:px-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">Autorizar miembro</h2>
        <p className="mt-2 text-sm leading-6 text-[#595954]">
          Indica el correo y el acceso que tendrá en cada workspace.
        </p>
      </div>

      <fieldset disabled={isPending || Boolean(confirmation)} className="min-w-0 space-y-6 border-0 p-5 disabled:opacity-70 sm:p-6">
        <legend className="sr-only">Correo y accesos del miembro</legend>
        <div className="max-w-lg">
          <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-medium">Correo del miembro</label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => {
              if (pendingRequest.current || isPending || confirmation) return;
              setEmail(event.target.value);
              setEmailError("");
              clearFeedback();
              if (hasUnavailableAssignments) setAssignments(availableAssignments);
            }}
            placeholder="correo@prisamedia.com"
            aria-invalid={Boolean(emailError)}
            aria-describedby={`${id}-email-hint${emailError ? ` ${id}-email-error` : ""}`}
            className="min-h-12 w-full rounded-md border border-[#FF5C35]/35 bg-white px-3 py-3 text-base text-[#171717] outline-none transition-colors placeholder:text-[#767670] focus:border-[#FF5C35] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35] aria-invalid:border-[#B42318] motion-reduce:transition-none"
            required
          />
          <p id={`${id}-email-hint`} className="mt-2 text-sm leading-5 text-[#595954]">Se usará este correo para identificar y autorizar al miembro.</p>
          {emailError && <p id={`${id}-email-error`} role="alert" className="mt-2 text-sm leading-5 text-[#9B231B]">{emailError}</p>}
        </div>

        <WorkspaceAccessSelector
          workspaces={workspaces}
          assignments={availableAssignments}
          query={workspaceQuery}
          onQueryChange={setWorkspaceQuery}
          onToggleWorkspace={toggleWorkspace}
          onRoleChange={updateRole}
          onClear={clearAssignments}
          disabled={isPending || Boolean(confirmation)}
          workspaceDescription="Selecciona los espacios a los que podrá acceder."
          emptySelectionDescription="Selecciona al menos uno para definir su rol."
        />
      </fieldset>

      {confirmation && (
        <section aria-labelledby={`${id}-confirmation`} className="mx-5 mb-6 border-l-2 border-[#FF5C35] bg-[#FFF8F5] p-4 sm:mx-6">
          <h3 ref={confirmationRef} tabIndex={-1} id={`${id}-confirmation`} className="text-sm font-semibold outline-none">Revisa los accesos antes de autorizar</h3>
          <p className="mt-2 text-sm font-medium wrap-anywhere">{confirmation.email}</p>
          <ul className="mt-3 divide-y divide-[#FF5C35]/15">
            {confirmation.assignments.map((assignment) => (
              <li key={assignment.workspaceId} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm leading-5">
                <span className="wrap-anywhere">{workspaces.find((workspace) => workspace.id === assignment.workspaceId)?.name ?? assignment.workspaceId}</span>
                <span className="font-medium">{assignment.role === "EDITOR" ? "Editor" : "Lector"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-5 text-[#595954]">Si ya tenía acceso a estos workspaces, se actualizarán sus roles. Los demás accesos se conservarán.</p>
        </section>
      )}

      {displayedError && <p role="alert" className="mx-5 mb-5 flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FFF4F2] p-3 text-sm leading-5 text-[#9B231B] sm:mx-6"><LuCircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 wrap-anywhere">{displayedError}</span></p>}
      <p role="status" aria-atomic="true" className={success ? "mx-5 mb-5 flex items-start gap-2 text-sm leading-6 text-[#356044] sm:mx-6" : "sr-only"}>
        {success && <LuCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />}
        {isPending ? "Guardando los accesos del miembro." : success}
      </p>

      <div className="flex min-w-0 flex-col gap-4 border-t border-[#E8E8E6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="min-w-0 text-sm leading-5 text-[#595954]">
          {isPending ? "Guardando los accesos…" : `${availableAssignments.length} ${availableAssignments.length === 1 ? "workspace seleccionado" : "workspaces seleccionados"}`}
        </p>
        <div className={`grid w-full min-w-0 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-nowrap sm:gap-3 ${confirmation ? "grid-cols-2" : "grid-cols-1"}`}>
          {confirmation && (
            <button type="button" disabled={isPending} onClick={() => {
              if (pendingRequest.current || isPending) return;
              setConfirmation(null);
              setError("");
            }} className="inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#D1D1CD] px-2 py-2 text-center text-sm leading-5 text-[#595954] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-50 sm:gap-2 sm:px-4">
              <LuArrowLeft aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 wrap-anywhere">Volver a editar</span>
            </button>
          )}
          <button key={confirmation ? "confirm" : "review"} name="intent" value={confirmation ? "confirm" : "review"} type="submit" disabled={isPending || workspaces.length === 0} className="inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#FF5C35] px-2 py-3 text-center text-sm font-semibold leading-5 text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:gap-2 sm:px-4">
            {isPending ? <><LuLoader aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /><span className="min-w-0 wrap-anywhere">Autorizando…</span></> : confirmation ? <><LuCheck aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 wrap-anywhere">Confirmar autorización</span></> : <><span className="min-w-0 wrap-anywhere">Revisar accesos</span><LuArrowRight aria-hidden="true" className="size-4 shrink-0" /></>}
          </button>
        </div>
      </div>
    </form>
  );
}
