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
import { type AuditTimelineEvent } from "@/features/admin/audit/services/audit-timeline.service";
import { LuArrowDown, LuArrowUp, LuChevronsUpDown } from "react-icons/lu";

type Props = {
  timeline: AuditTimelineEvent[];
};

const RECENT_ACTIVITY_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const recentActivityColumnHelper = createColumnHelper<
  typeof RECENT_ACTIVITY_TABLE_FEATURES,
  AuditTimelineEvent
>();

const RECENT_ACTIVITY_COLUMNS = recentActivityColumnHelper.columns([
  recentActivityColumnHelper.accessor((event) => event.title, {
    id: "event",
    header: "Evento",
  }),
  recentActivityColumnHelper.accessor((event) => `${event.detail} ${event.actor}`, {
    id: "detail",
    header: "Detalle",
  }),
  recentActivityColumnHelper.accessor((event) => event.createdAt.getTime(), {
    id: "createdAt",
    header: "Fecha",
    sortDescFirst: true,
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
  }).format(value);
}

function getEventBadgeClass(action: string, metadata: unknown) {
  if (metadata && typeof metadata === "object") {
    const eventType = (metadata as Record<string, unknown>).eventType;
    if (eventType === "MEMBER_AUTHORIZED")
      return "bg-[#16A34A]/10 text-[#16A34A]";
    if (eventType === "MEMBER_REVOKED")
      return "bg-[#DC2626]/10 text-[#DC2626]";
    if (eventType === "OTP_RATE_LIMITED")
      return "bg-[#CA8A04]/10 text-[#CA8A04]";
  }
  const map: Record<string, string> = {
    WINNER_SELECTED:     "bg-[#16A34A]/10 text-[#16A34A]",
    SENSITIVE_DATA_VIEWED: "bg-[#DC2626]/10 text-[#DC2626]",
    FORM_CLONED:         "bg-sky-100 text-sky-700",
    OTP_REQUESTED:       "bg-violet-100 text-violet-700",
    LOGIN_SESSION_CREATED: "bg-sky-100 text-sky-700",
  };
  return map[action] ?? "bg-[#F5F5F5] text-[#737373]";
}

export function DashboardRecentActivity({ timeline }: Props) {
  const activityTable = useTable({
    features: RECENT_ACTIVITY_TABLE_FEATURES,
    data: timeline,
    columns: RECENT_ACTIVITY_COLUMNS,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.min(5, Math.max(1, timeline.length)),
      },
      sorting: [{ id: "createdAt", desc: true }],
    },
    getRowId: (event: AuditTimelineEvent) => `${event.source}-${event.id}`,
  });

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
        <h2 className="text-base font-semibold text-[#171717]">
          Actividad Reciente
        </h2>
        <span className="text-xs text-[#737373]">Últimos eventos</span>
      </div>
      {timeline.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-[#737373]">
          Todavía no hay eventos registrados.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse lg:min-w-190">
              <colgroup>
                <col className="w-48" />
                <col />
                <col className="w-56" />
              </colgroup>

              <thead className="bg-[#FBFBFA]">
                {activityTable.getHeaderGroups().map((headerGroup) => (
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
                                activityTable.setPageIndex(0);
                                header.column.toggleSorting();
                              }}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                                sortDirection
                                  ? "bg-[#F5F5F5] text-[#171717]"
                                  : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
                              }`}
                              aria-label={`Ordenar por ${String(header.column.columnDef.header)}. ${getSortingLabel(sortDirection)}`}
                            >
                              <activityTable.FlexRender header={header} />
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
                          <activityTable.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {activityTable.getPaginatedRowModel().rows.map((row) => {
                  const event = row.original;

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#E5E5E5] transition-colors last:border-b-0 hover:bg-[#F5F5F5]"
                    >
                      <td className="px-4 py-3 align-middle sm:px-5">
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-medium ${getEventBadgeClass(event.action, event.metadata)}`}
                        >
                          {event.title}
                        </span>
                      </td>
                      <td className="min-w-0 px-4 py-3 align-middle sm:px-5">
                        <p className="truncate text-sm text-[#171717]">
                          {event.detail}
                        </p>
                        <p className="truncate text-xs text-[#737373]">
                          {event.actor}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[#737373] sm:px-5">
                        {formatDate(event.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ResponseTablePagination table={activityTable} />
        </>
      )}
    </div>
  );
}
