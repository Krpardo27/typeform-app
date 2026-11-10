"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LuArrowLeft, LuCheck, LuCircleAlert, LuLoader } from "react-icons/lu";
import { updateUserWorkspaces } from "../actions/update-user-workspaces";
import {
  getWorkspaceAssignmentKey,
  getWorkspacePermissionChanges,
} from "../utils/workspace-permission-changes";
import {
  WorkspaceAccessSelector,
  type WorkspaceAccessRole,
} from "./WorkspaceAccessSelector";

type Workspace = {
  id: string;
  name: string;
  typeformId: string;
  templateFormTypeformId?: string | null;
};

type WorkspaceRole = "VIEWER" | "EDITOR";

type WorkspaceAssignment = {
  workspaceId: string;
  role: WorkspaceRole;
};

type Props = {
  userId: string;
  workspaces: Workspace[];
  assignedWorkspaces: WorkspaceAssignment[];
};

export function UserWorkspaceForm({
  userId,
  workspaces,
  assignedWorkspaces,
}: Props) {
  return (
    <UserWorkspaceEditor
      key={userId}
      userId={userId}
      workspaces={workspaces}
      assignedWorkspaces={assignedWorkspaces}
    />
  );
}

function UserWorkspaceEditor({
  userId,
  workspaces,
  assignedWorkspaces,
}: Props) {
  const router = useRouter();
  const id = useId();
  const pendingRequest = useRef(false);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const wasReviewing = useRef(false);
  const [baseline, setBaseline] = useState(assignedWorkspaces);
  const [assignments, setAssignments] =
    useState<WorkspaceAssignment[]>(assignedWorkspaces);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [confirmation, setConfirmation] = useState<
    WorkspaceAssignment[] | null
  >(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const availableWorkspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const availableAssignments = assignments.filter((assignment) => availableWorkspaceIds.has(assignment.workspaceId));
  const availableBaseline = baseline.filter((assignment) => availableWorkspaceIds.has(assignment.workspaceId));
  const hasStaleReview = Boolean(confirmation?.some((assignment) => !availableWorkspaceIds.has(assignment.workspaceId)));
  const hasChanges =
    getWorkspaceAssignmentKey(availableBaseline) !==
    getWorkspaceAssignmentKey(availableAssignments);
  const changes = getWorkspacePermissionChanges(
    availableBaseline,
    (confirmation ?? assignments).filter((assignment) => availableWorkspaceIds.has(assignment.workspaceId)),
  );
  const displayedError = error || (hasStaleReview
    ? "La disponibilidad de los workspaces cambió. Revisa los accesos disponibles antes de guardar."
    : "");

  useEffect(() => {
    if (confirmation) {
      wasReviewing.current = true;
      confirmationRef.current?.focus();
    } else if (wasReviewing.current && !isPending) {
      wasReviewing.current = false;
      reviewButtonRef.current?.focus();
    }
  }, [confirmation, isPending]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function toggleWorkspace(workspaceId: string) {
    if (pendingRequest.current || confirmation || !availableWorkspaceIds.has(workspaceId)) return;
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
    if (pendingRequest.current || confirmation) return;
    clearFeedback();
    setAssignments((current) =>
      current.filter((item) => availableWorkspaceIds.has(item.workspaceId)).map((item) =>
        item.workspaceId === workspaceId ? { ...item, role } : item,
      ),
    );
  }

  function handleClearAssignments() {
    if (pendingRequest.current || confirmation) return;
    clearFeedback();
    setAssignments([]);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    if (hasStaleReview) {
      setConfirmation(null);
      setAssignments(availableAssignments);
      setError("La lista de workspaces cambió. Revisa de nuevo los accesos disponibles antes de guardar.");
      return;
    }
    if (!hasChanges) {
      return;
    }
    clearFeedback();

    if (!confirmation) {
      setConfirmation(availableAssignments.map((assignment) => ({ ...assignment })));
      return;
    }

    const snapshot = confirmation;
    pendingRequest.current = true;
    startTransition(async () => {
      try {
        const response = await updateUserWorkspaces({
          userId,
          workspaceIds: snapshot.map(
            (item) => `${item.workspaceId}::${item.role}`,
          ),
        });
        if (!response.success) {
          setError(response.message);
          toast.error(response.message);
          return;
        }

        setBaseline(snapshot);
        setAssignments(snapshot);
        setConfirmation(null);
        setMessage(response.message);
        if (response.changed) toast.success(response.message);
        else toast.info(response.message);
        router.refresh();
      } catch {
        const text =
          "No pudimos confirmar el guardado. Revisa los permisos actuales antes de volver a intentarlo.";
        setError(text);
        toast.error(text);
      } finally {
        pendingRequest.current = false;
      }
    });
  }

  const selectedCount = availableAssignments.length;

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${id}-title`}
      className="min-w-0 overflow-hidden rounded-md border border-[#FF5C35]/35 bg-white text-[#171717]"
    >
      <div className="border-b border-[#FF5C35]/20 px-5 py-5 sm:px-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          Workspaces autorizados
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#595954]">
          Selecciona las radios y el rol dentro de cada una.
        </p>

        <div className="mt-4 grid gap-x-6 gap-y-2 text-sm leading-5 text-[#595954] sm:grid-cols-2">
          <p>
            <span className="font-medium text-[#171717]">Lector:</span> consulta
            de formularios y respuestas.
          </p>
          <p>
            <span className="font-medium text-[#171717]">Editor:</span> puede
            crear y duplicar formularios en su workspace.
          </p>
        </div>
      </div>

      <fieldset
        disabled={isPending || Boolean(confirmation)}
        className="min-w-0 border-0 p-5 disabled:opacity-70 sm:p-6"
      >
        <legend className="sr-only">
          Seleccionar workspaces y roles del usuario
        </legend>
        <WorkspaceAccessSelector
          workspaces={workspaces}
          assignments={availableAssignments}
          query={workspaceQuery}
          onQueryChange={setWorkspaceQuery}
          onToggleWorkspace={toggleWorkspace}
          onRoleChange={updateRole}
          onClear={handleClearAssignments}
          disabled={isPending || Boolean(confirmation)}
          workspaceDescription="Elige los workspaces a los que tendrá acceso este usuario."
          emptySelectionDescription="Sin selección, el usuario no tendrá acceso a los workspaces disponibles de la aplicación."
        />
      </fieldset>

      {confirmation && (
        <section
          aria-labelledby={`${id}-review`}
          className="mx-5 mb-6 border-l-2 border-[#FF5C35] bg-[#FFF8F5] p-4 sm:mx-6"
        >
          <h3
            id={`${id}-review`}
            ref={confirmationRef}
            tabIndex={-1}
            className="text-sm font-semibold outline-none"
          >
            Revisa los cambios de permisos
          </h3>
          {confirmation.length === 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#9B231B]">
              <LuCircleAlert
                aria-hidden="true"
                className="mt-1 size-4 shrink-0"
              />
              <span>
                El usuario quedará sin acceso a los workspaces disponibles de la
                aplicación.
              </span>
            </p>
          )}
          <ul className="mt-3 divide-y divide-[#FF5C35]/15">
            {[
              ...changes.added.map((assignment) => ({
                ...assignment,
                kind: "Nuevo acceso",
              })),
              ...changes.changed.map((assignment) => ({
                ...assignment,
                kind: "Cambiar rol",
              })),
              ...changes.removed.map((assignment) => ({
                ...assignment,
                kind: "Retirar acceso",
              })),
            ].map((assignment) => (
              <li
                key={assignment.workspaceId}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm leading-5"
              >
                <span className="min-w-0 wrap-anywhere">
                  {workspaces.find(
                    (workspace) => workspace.id === assignment.workspaceId,
                  )?.name ?? assignment.workspaceId}
                </span>
                <span
                  className={
                    assignment.kind === "Retirar acceso"
                      ? "font-medium text-[#9B231B]"
                      : "font-medium"
                  }
                >
                  {assignment.kind}
                  {assignment.kind !== "Retirar acceso" &&
                    ` · ${assignment.role === "EDITOR" ? "Editor" : "Lector"}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-5 text-[#595954]">
            Solo se aplicarán estos cambios. Los accesos sin cambios se
            conservarán.
          </p>
        </section>
      )}

      {displayedError && (
        <p
          role="alert"
          className="mx-5 mb-5 flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FFF4F2] p-3 text-sm leading-5 text-[#9B231B] sm:mx-6"
        >
          <LuCircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span>{displayedError}</span>
        </p>
      )}
      <p
        role="status"
        aria-atomic="true"
        className={
          message
            ? "mx-5 mb-5 flex items-start gap-2 text-sm leading-6 text-[#356044] sm:mx-6"
            : "sr-only"
        }
      >
        {message && (
          <LuCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />
        )}
        {isPending ? "Guardando permisos." : message}
      </p>

      <div className="flex min-w-0 flex-col gap-4 border-t border-[#E8E8E6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="min-w-0 text-sm leading-5 text-[#595954]">
          {selectedCount}{" "}
          {selectedCount === 1
            ? "workspace seleccionado"
            : "workspaces seleccionados"}
          <span className="mt-1 block">
            {isPending
              ? "Guardando permisos…"
              : hasChanges
                ? "Tienes cambios sin guardar"
                : "Sin cambios pendientes"}
          </span>
        </p>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-nowrap sm:gap-3">
          {confirmation ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (pendingRequest.current) return;
                setConfirmation(null);
                clearFeedback();
              }}
              className="inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#D1D1CD] px-1 py-2 text-center text-sm leading-5 text-[#595954] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-50 sm:gap-2 sm:px-4"
            >
              <LuArrowLeft aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 wrap-anywhere">Volver a editar</span>
            </button>
          ) : (
            hasChanges && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (pendingRequest.current) return;
                  setAssignments(
                    availableBaseline.map((assignment) => ({ ...assignment })),
                  );
                  clearFeedback();
                }}
                className="inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-sm px-2 py-2 text-center text-sm leading-5 text-[#595954] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]"
              >
                Descartar cambios
              </button>
            )
          )}
          <button
            ref={reviewButtonRef}
            type="submit"
            disabled={isPending || (!hasChanges && !hasStaleReview)}
            className={`inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#FF5C35] px-1 py-3 text-center text-sm font-semibold leading-5 text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:bg-[#F0F0ED] disabled:text-[#65655F] motion-reduce:transition-none sm:gap-2 sm:px-4 ${!confirmation && !hasChanges ? "col-span-2" : ""}`}
          >
            {isPending ? (
              <>
                <LuLoader
                  aria-hidden="true"
                  className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
                />
                <span className="min-w-0 wrap-anywhere">Guardando…</span>
              </>
            ) : confirmation ? (
              <>
                <LuCheck aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 wrap-anywhere">Confirmar cambios</span>
              </>
            ) : (
              "Guardar permisos"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
