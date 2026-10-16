"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ResponseTablePagination } from "@/features/typeform/components/responses/ResponseTablePagination";
import { LuArrowDown, LuArrowUp, LuChevronsUpDown } from "react-icons/lu";

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

type RecentWhitelistRow = {
  allowed: AllowedUserItem;
  user?: WhitelistedUser;
};

const RECENT_WHITELIST_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const recentWhitelistColumnHelper = createColumnHelper<
  typeof RECENT_WHITELIST_TABLE_FEATURES,
  RecentWhitelistRow
>();

const RECENT_WHITELIST_COLUMNS = recentWhitelistColumnHelper.columns([
  recentWhitelistColumnHelper.accessor((row) => row.allowed.email, {
    id: "member",
    header: "Miembro",
  }),
  recentWhitelistColumnHelper.accessor((row) => row.user?.workspaces.length ?? 0, {
    id: "workspaces",
    header: "Workspaces",
  }),
]);

function getSortingLabel(sortDirection: false | "asc" | "desc") {
  if (sortDirection === "asc") return "Orden ascendente";
  if (sortDirection === "desc") return "Orden descendente";
  return "Sin orden";
}

function getSortIcon(sortDirection: false | "asc" | "desc") {
  if (sortDirection === "asc") return LuArrowUp;
  if (sortDirection === "desc") return LuArrowDown;
  return LuChevronsUpDown;
}

function formatDate(value: Date) {
  return value.toLocaleString("es-CL");
}

function WorkspaceSummary({ user }: { user?: WhitelistedUser }) {
  if (!user || user.workspaces.length === 0) {
    return (
      <span className="text-xs text-[#737373]">Sin workspaces asignados</span>
    );
  }

  return (
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
  );
}

export function RecentWhitelist({ allowedUsers, users }: Props) {
  const tableRows = useMemo<RecentWhitelistRow[]>(
    () => {
      const userByEmail = new Map(
        users.map((user) => [user.email.toLowerCase(), user]),
      );

      return allowedUsers.map((allowed) => ({
        allowed,
        user: userByEmail.get(allowed.email.toLowerCase()),
      }));
    },
    [allowedUsers, users],
  );

  const whitelistTable = useTable({
    features: RECENT_WHITELIST_TABLE_FEATURES,
    data: tableRows,
    columns: RECENT_WHITELIST_COLUMNS,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.min(10, Math.max(1, tableRows.length)),
      },
    },
    getRowId: (row: RecentWhitelistRow) => row.allowed.id,
  });

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
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse lg:min-w-190">
              <colgroup>
                <col className="w-80" />
                <col />
              </colgroup>

              <thead className="bg-[#FBFBFA]">
                {whitelistTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E5E5E5]"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#737373] sm:px-5"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (() => {
                          const sortDirection = header.column.getIsSorted();
                          const SortIcon = getSortIcon(sortDirection);

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                whitelistTable.setPageIndex(0);
                                header.column.toggleSorting();
                              }}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                                sortDirection
                                  ? "bg-[#F5F5F5] text-[#171717]"
                                  : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
                              }`}
                              aria-label={`Ordenar por ${String(header.column.columnDef.header)}. ${getSortingLabel(sortDirection)}`}
                            >
                              <whitelistTable.FlexRender header={header} />
                              <SortIcon
                                className={`size-3.5 transition-colors ${
                                  sortDirection
                                    ? "text-[#171717]"
                                    : "text-[#737373]/50"
                                }`}
                              />
                            </button>
                          );
                        })() : (
                          <whitelistTable.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {whitelistTable.getPaginatedRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#E5E5E5] transition-colors last:border-b-0 hover:bg-[#F5F5F5]"
                  >
                    <td className="min-w-0 px-4 py-3 align-middle text-sm sm:px-5">
                      <p className="truncate text-[#171717]">
                        {row.original.allowed.email}
                      </p>
                      <p className="text-xs text-[#737373]">
                        {formatDate(row.original.allowed.createdAt)}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-middle sm:px-5">
                      <WorkspaceSummary user={row.original.user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponseTablePagination table={whitelistTable} />
        </>
      )}
    </section>
  );
}