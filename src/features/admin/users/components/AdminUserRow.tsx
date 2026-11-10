import Link from "next/link";
import { LuChevronDown } from "react-icons/lu";
import { DeleteUserButton } from "./DeleteUserButton";
import { WorkspaceRadioLogo } from "@/features/admin/workspaces/components/WorkspaceRadioLogo";

type UserWorkspace = {
  role: string;
  workspace: {
    id: string;
    name: string;
    typeformId: string;
    templateFormTypeformId?: string | null;
  };
};

type AdminUserRowProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    globalRole: string;
    workspaces: UserWorkspace[];
  };
  isSelf: boolean;
};

function RoleLabel({ role }: { role: string }) {
  const label =
    role === "SUPER_ADMIN"
      ? "Superadministrador"
      : role === "USER"
        ? "Usuario"
        : "Sin rol definido";

  return (
    <span className="text-sm font-medium leading-5 text-[#525252]">
      {label}
    </span>
  );
}

function WorkspaceList({ workspaces, label = "Radios asignadas", size = 48 }: { workspaces: UserWorkspace[]; label?: string; size?: 48 | 64 }) {
  return (
    <ul
      aria-label={label}
      className="relative flex w-44 max-w-full flex-wrap items-center gap-2 lg:w-auto"
    >
      {workspaces.map(({ role, workspace }) => {
        const roleLabel =
          role === "EDITOR"
            ? "Editor"
            : role === "VIEWER"
              ? "Lector"
              : "Sin rol definido";

        return (
          <li
            key={workspace.id}
            title={`${workspace.name} · ${roleLabel}`}
            className="min-w-0 max-w-40 text-sm leading-5 text-[#525252]"
          >
            <WorkspaceRadioLogo
              workspace={workspace}
              size={size}
              alt={workspace.name}
            />
            <span className="sr-only"> · {roleLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}

function WorkspaceSummary({ workspaces }: { workspaces: UserWorkspace[] }) {
  if (workspaces.length === 0) {
    return <span className="text-sm text-[#737373]">Sin asignar</span>;
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-sm leading-5 text-[#737373]">
        {workspaces.length} {workspaces.length === 1 ? "radio" : "radios"}
      </p>
      <div className="space-y-1.5 lg:hidden">
        <WorkspaceList workspaces={workspaces.slice(0, 3)} />
        {workspaces.length > 3 && (
          <details className="group min-w-0">
            <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-medium text-[#595954] marker:hidden hover:text-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Ver las {workspaces.length} radios</span>
              <span className="hidden group-open:inline">Ocultar radios</span>
              <LuChevronDown aria-hidden="true" className="size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="pt-2">
              <WorkspaceList workspaces={workspaces.slice(3)} label="Radios adicionales asignadas" />
            </div>
          </details>
        )}
      </div>
      <div className="hidden lg:block">
        <WorkspaceList workspaces={workspaces} size={64} />
      </div>
    </div>
  );
}

export function AdminUserRow({ user, isSelf }: AdminUserRowProps) {
  const name = user.name?.trim();
  const displayName = name || "Sin nombre";
  const actionName = name || user.email;

  return (
    <tr className="border-b border-[#E5E5E5] transition-colors last:border-b-0 hover:bg-[#FAFAFA] motion-reduce:transition-none">
      <td className="min-w-0 px-3 py-3 align-top sm:px-5 sm:py-4">
        <p className="max-w-xs wrap-anywhere font-medium leading-5 text-[#171717]">
          {displayName}
        </p>
        <p className="mt-1 max-w-xs wrap-anywhere text-sm leading-5 text-[#737373]">
          {user.email}
        </p>
        {isSelf && (
          <p className="mt-1 text-sm leading-5 text-[#737373]">Tu cuenta</p>
        )}
      </td>

      <td className="px-3 py-3 align-top sm:px-5 sm:py-4">
        <RoleLabel role={user.globalRole} />
      </td>

      <td className="px-3 py-3 align-top sm:px-5 sm:py-4">
        <WorkspaceSummary workspaces={user.workspaces} />
      </td>

      <td className="px-3 py-3 align-top sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/admin/users/${user.id}`}
            aria-label={`Gestionar a ${actionName}`}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#D1D1CD] bg-white px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none"
          >
            Gestionar
          </Link>
          <DeleteUserButton
            userId={user.id}
            userName={actionName}
            disabled={isSelf}
          />
        </div>
      </td>
    </tr>
  );
}
