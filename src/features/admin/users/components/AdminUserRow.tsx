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
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-zinc-700 text-zinc-400"
      }`}
    >
      {role}
    </span>
  );
}

function WorkspaceCount({ count }: { count: number }) {
  return count === 0 ? (
    <span className="text-sm text-zinc-600">Sin asignar</span>
  ) : (
    <span className="text-sm text-zinc-400">
      {count} workspace{count !== 1 ? "s" : ""} asignado
      {count !== 1 ? "s" : ""}
    </span>
  );
}

export function AdminUserRow({ user, isSelf }: AdminUserRowProps) {
  const workspaceCount = user.workspaces.length;
  const displayName = user.name || "Sin nombre";

  return (
    <article className="grid gap-4 px-4 py-4 transition hover:bg-zinc-900/40 sm:px-5 lg:grid-cols-12 lg:items-center">
      <div className="min-w-0 lg:col-span-4">
        <p className="truncate font-medium text-white">{displayName}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
      </div>

      <div className="flex items-center justify-between gap-3 lg:col-span-3 lg:block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 lg:hidden">
          Rol
        </span>
        <RoleBadge role={user.globalRole} />
      </div>

      <div className="flex items-center justify-between gap-3 lg:col-span-3 lg:block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 lg:hidden">
          Workspaces
        </span>
        <WorkspaceCount count={workspaceCount} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 pt-3 lg:col-span-2 lg:border-t-0 lg:pt-0">
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
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