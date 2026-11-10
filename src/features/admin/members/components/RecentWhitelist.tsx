"use client";

import { useId, useMemo } from "react";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ResponseTablePagination } from "@/features/typeform/components/responses/ResponseTablePagination";
import { LuArrowDown, LuArrowUp, LuChevronsUpDown } from "react-icons/lu";
import { WorkspaceRadioLogo } from "@/features/admin/workspaces/components/WorkspaceRadioLogo";

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
    templateFormTypeformId?: string | null;
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
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const recentWhitelistColumnHelper = createColumnHelper<
  typeof RECENT_WHITELIST_TABLE_FEATURES,
  RecentWhitelistRow
>();

const RECENT_WHITELIST_COLUMNS = recentWhitelistColumnHelper.columns([
  recentWhitelistColumnHelper.accessor((row) => row.allowed.email, {
    id: "member",
    header: "Miembro",
    sortFn: "alphanumeric",
    sortDescFirst: false,
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
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function WorkspaceLabel({ assignment }: { assignment: UserWorkspaceAssignment }) {
  const role = assignment.role === "VIEWER" ? "Lector" : assignment.role === "EDITOR" ? "Editor" : "Rol no informado";

  return (
    <li title={`${assignment.workspace.name} · ${role}`} className="min-w-0 max-w-40">
      <WorkspaceRadioLogo workspace={assignment.workspace} size={80} alt={assignment.workspace.name} />
      <span className="sr-only"> · {role}</span>
    </li>
  );
}

function WorkspaceSummary({ user }: { user?: WhitelistedUser }) {
  if (!user || user.workspaces.length === 0) {
    return (
      <span className="text-sm leading-5 text-[#595954]">Sin workspaces asignados</span>
    );
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {user.workspaces.map((assignment) => (
        <WorkspaceLabel key={`${user.id}-${assignment.workspaceId}`} assignment={assignment} />
      ))}
    </ul>
  );
}

export function RecentWhitelist({ allowedUsers, users }: Props) {
  const id = useId();
  const tableRows = useMemo<RecentWhitelistRow[]>(
    () => {
      const userByEmail = new Map(
        users.map((user) => [user.email.trim().toLowerCase(), user]),
      );

      return allowedUsers.map((allowed) => ({
        allowed,
        user: userByEmail.get(allowed.email.trim().toLowerCase()),
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
        pageSize: 10,
      },
    },
    getRowId: (row: RecentWhitelistRow) => row.allowed.id,
  });

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 overflow-hidden rounded-md border border-[#FF5C35]/35 bg-white text-[#171717]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[#FF5C35]/20 px-5 py-4">
        <div>
          <h2 id={`${id}-title`} className="text-base font-semibold">
            Miembros autorizados recientes
          </h2>
          <p id={`${id}-description`} className="mt-1 text-sm leading-5 text-[#595954]">
            Registros recientes de autorización y sus accesos actuales. Fechas en UTC.
          </p>
        </div>
        <p className="text-sm leading-5 text-[#595954] tabular-nums">
          {allowedUsers.length} {allowedUsers.length === 1 ? "registro cargado" : "registros cargados"}
        </p>
      </div>

      {allowedUsers.length === 0 ? (
        <div className="px-5 py-8 text-sm leading-6 text-[#595954]">
          Aún no hay miembros autorizados.
        </div>
      ) : (
        <>
          <div role="region" aria-label="Tabla de miembros autorizados" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF5C35]">
            <table aria-describedby={`${id}-description`} className="w-full min-w-160 border-collapse lg:min-w-190">
              <caption className="sr-only">Miembros autorizados y workspaces asignados</caption>
              <colgroup>
                <col className="w-80" />
                <col />
              </colgroup>

              <thead className="bg-[#FBFBFA]">
                {whitelistTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E8E8E6]"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
                        className="px-4 py-2 text-left text-sm font-medium text-[#595954] sm:px-5"
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
                              className={`-ml-1.5 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none ${
                                sortDirection
                                  ? "text-[#A53318]"
                                  : "text-[#595954] hover:bg-[#FFF1EC] hover:text-[#171717]"
                              }`}
                              aria-label={`Ordenar por ${String(header.column.columnDef.header)}. ${getSortingLabel(sortDirection)}`}
                            >
                              <whitelistTable.FlexRender header={header} />
                              <SortIcon
                                aria-hidden="true"
                                className={`size-3.5 transition-colors ${
                                  sortDirection
                                    ? "text-[#A53318]"
                                    : "text-[#737373]"
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
                    className="border-b border-[#E8E8E6] transition-colors last:border-b-0 hover:bg-[#FFFDFB] motion-reduce:transition-none"
                  >
                    <td className="min-w-0 px-4 py-3 align-middle text-sm sm:px-5">
                      <p className="font-medium text-[#171717] wrap-anywhere">
                        {row.original.allowed.email}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#595954]">
                        <time dateTime={row.original.allowed.createdAt.toISOString()}>{formatDate(row.original.allowed.createdAt)} UTC</time>
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