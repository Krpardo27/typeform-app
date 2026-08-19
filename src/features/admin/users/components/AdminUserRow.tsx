import Link from "next/link";
import { DeleteUserButton } from "./DeleteUserButton";

type AdminUserRowProps = {
  user: {
    id: string;
    name: string;
    email: string;
    globalRole: string;
    workspaces: unknown[];
  };
  isSelf: boolean;
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`w-fit rounded-md border px-2 py-1 text-xs ${
        role === "SUPER_ADMIN"
          ? "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]"
          : "border-[#E5E5E5] text-[#737373]"
      }`}
    >
      {role}
    </span>
  );
}

function WorkspaceCount({ count }: { count: number }) {
  return count === 0 ? (
    <span className="text-sm text-[#737373]">Sin asignar</span>
  ) : (
    <span className="text-sm text-[#737373]">
      {count} workspace{count !== 1 ? "s" : ""} asignado
      {count !== 1 ? "s" : ""}
    </span>
  );
}

export function AdminUserRow({ user, isSelf }: AdminUserRowProps) {
  const workspaceCount = user.workspaces.length;
  const displayName = user.name || "Sin nombre";

  return (
    <article className="grid gap-4 px-4 py-4 transition hover:bg-[#F5F5F5] sm:px-5 lg:grid-cols-12 lg:items-center">
      <div className="min-w-0 lg:col-span-4">
        <p className="truncate font-medium text-[#171717]">{displayName}</p>
        <p className="truncate text-xs text-[#737373]">{user.email}</p>
      </div>

      <div className="flex items-center justify-between gap-3 lg:col-span-3 lg:block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 lg:hidden">
          Rol
        </span>
        <RoleBadge role={user.globalRole} />
      </div>

      <div className="flex items-center justify-between gap-3 lg:col-span-3 lg:block">
        <span className="text-xs font-medium uppercase tracking-wider text-[#737373] lg:hidden">
          Workspaces
        </span>
        <WorkspaceCount count={workspaceCount} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E5E5E5] pt-3 lg:col-span-2 lg:border-t-0 lg:pt-0">
        <Link
          href={`/admin/users/${user.id}`}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-1.5 text-xs text-[#737373] transition hover:border-[#18181B] hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#E5E5E5] disabled:hover:text-[#737373]"
        >
          Gestionar
        </Link>
        <DeleteUserButton
          userId={user.id}
          userName={displayName === "Sin nombre" ? user.email : displayName}
          disabled={isSelf}
        />
      </div>
    </article>
  );
}
