type AllowedUserItem = {
  id: string;
  email: string;
  createdAt: Date;
};

type UserWorkspaceAssignment = {
  workspaceId: string;
  role: string;
  workspace: {
    name: string;
    typeformId: string;
  };
};

type WhitelistedUser = {
  id: string;
  email: string;
  workspaces: UserWorkspaceAssignment[];
};

type Props = {
  allowedUsers: AllowedUserItem[];
  users: WhitelistedUser[];
};

export function RecentWhitelist({ allowedUsers, users }: Props) {
  const userByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user]),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      <div className="border-b border-[#E5E5E5] px-5 py-3">
        <h2 className="text-sm font-semibold text-[#171717]">
          Whitelist reciente
        </h2>
      </div>

      {allowedUsers.length === 0 ? (
        <div className="px-5 py-4 text-sm text-[#737373]">
          Aun no hay miembros autorizados.
        </div>
      ) : (
          <div className="divide-y divide-[#E5E5E5]">
          {allowedUsers.map((allowed) => {
            const user = userByEmail.get(allowed.email.toLowerCase());

            return (
              <div
                key={allowed.id}
                className="grid grid-cols-12 items-center gap-2 px-5 py-3 text-sm"
              >
                <div className="col-span-5 min-w-0">
                  <p className="truncate text-[#171717]">{allowed.email}</p>
                  <p className="text-xs text-[#737373]">
                    {allowed.createdAt.toLocaleString("es-CL")}
                  </p>
                </div>

                <div className="col-span-7">
                  {!user || user.workspaces.length === 0 ? (
                    <span className="text-xs text-[#737373]">
                      Sin workspaces asignados
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {user.workspaces.slice(0, 4).map((assignment) => (
                        <span
                          key={`${user.id}-${assignment.workspaceId}`}
                          className="rounded-md border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1 text-xs text-[#171717]"
                        >
                          {assignment.workspace.name} · {assignment.role}
                        </span>
                      ))}

                      {user.workspaces.length > 4 && (
                        <span className="rounded-md border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1 text-xs text-[#737373]">
                          +{user.workspaces.length - 4} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}