import { AdminUserRow } from "./AdminUserRow";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  globalRole: string;
  workspaces: unknown[];
};

type AdminUsersListProps = {
  users: AdminUser[];
  currentUserId: string;
};

export function AdminUsersList({ users, currentUserId }: AdminUsersListProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      <div className="hidden grid-cols-12 border-b border-[#E5E5E5] px-5 py-3 text-xs uppercase tracking-wider text-[#737373] lg:grid">
        <div className="col-span-4">Usuario</div>
        <div className="col-span-3">Rol</div>
        <div className="col-span-3">Workspaces</div>
        <div className="col-span-2 text-right">Acción</div>
      </div>

      <div className="divide-y divide-[#E5E5E5]">
        {users.map((user) => (
          <AdminUserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentUserId}
          />
        ))}
      </div>
    </section>
  );
}