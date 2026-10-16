"use client";

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
import { AdminUserRow } from "./AdminUserRow";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  globalRole: string;
  workspaces: {
    role: string;
    workspace: {
      id: string;
      name: string;
      typeformId: string;
    };
  }[];
};

type AdminUsersListProps = {
  users: AdminUser[];
  currentUserId: string;
};

const ADMIN_USERS_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const adminUsersTableColumnHelper = createColumnHelper<
  typeof ADMIN_USERS_TABLE_FEATURES,
  AdminUser
>();

const ADMIN_USERS_TABLE_COLUMNS = adminUsersTableColumnHelper.columns([
  adminUsersTableColumnHelper.accessor(
    (user) => `${user.name || "Sin nombre"} ${user.email}`,
    { id: "user", header: "Usuario" },
  ),
  adminUsersTableColumnHelper.accessor((user) => user.globalRole, {
    id: "role",
    header: "Rol",
  }),
  adminUsersTableColumnHelper.accessor((user) => user.workspaces.length, {
    id: "workspaces",
    header: "Workspaces",
  }),
  adminUsersTableColumnHelper.display({
    id: "actions",
    header: "Acción",
    enableSorting: false,
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

export function AdminUsersList({ users, currentUserId }: AdminUsersListProps) {
  const usersTable = useTable({
    features: ADMIN_USERS_TABLE_FEATURES,
    data: users,
    columns: ADMIN_USERS_TABLE_COLUMNS,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.min(10, Math.max(1, users.length)),
      },
    },
    getRowId: (user: AdminUser) => user.id,
  });
  const columnCount = usersTable.getAllLeafColumns().length;

  return (
    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse lg:min-w-220">
          <colgroup>
            <col className="w-80" />
            <col className="w-52" />
            <col />
            <col className="w-48" />
          </colgroup>

          <thead className="bg-[#FBFBFA]">
            {usersTable.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[#E5E5E5]"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#737373] last:text-right sm:px-5"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (() => {
                      const sortDirection = header.column.getIsSorted();
                      const SortIcon = getSortIcon(sortDirection);

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            usersTable.setPageIndex(0);
                            header.column.toggleSorting();
                          }}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                            sortDirection
                              ? "bg-[#F5F5F5] text-[#171717]"
                              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
                          }`}
                          aria-label={`Ordenar por ${String(header.column.columnDef.header)}. ${getSortingLabel(sortDirection)}`}
                        >
                          <usersTable.FlexRender header={header} />
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
                      <usersTable.FlexRender header={header} />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {usersTable.getPaginatedRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-5 py-10 text-center text-sm text-[#737373]"
                >
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usersTable.getPaginatedRowModel().rows.map((row) => (
                <AdminUserRow
                  key={row.id}
                  user={row.original}
                  isSelf={row.original.id === currentUserId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <ResponseTablePagination table={usersTable} />
    </section>
  );
}