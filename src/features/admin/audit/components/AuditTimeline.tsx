"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ResponseTablePagination } from "@/features/typeform/components/responses/ResponseTablePagination";
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronsUpDown,
  LuClock3,
  LuFilePlus2,
  LuKeyRound,
  LuLogIn,
  LuShieldCheck,
  LuTrophy,
  LuUserMinus,
  LuUserPlus,
} from "react-icons/lu";
import {
  getAuditMetadataEventType,
  type AuditTimelineEvent,
} from "../services/audit-timeline.service";

type Props = {
  timeline: AuditTimelineEvent[];
};

const AUDIT_TABLE_FEATURES = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const auditTableColumnHelper = createColumnHelper<
  typeof AUDIT_TABLE_FEATURES,
  AuditTimelineEvent
>();

const AUDIT_TABLE_COLUMNS = auditTableColumnHelper.columns([
  auditTableColumnHelper.accessor((event) => getSearchableEventText(event), {
    id: "search",
    header: "Buscar",
    enableSorting: false,
  }),
  auditTableColumnHelper.accessor((event) => event.title, {
    id: "event",
    header: "Evento",
  }),
  auditTableColumnHelper.accessor((event) => event.actor, {
    id: "actor",
    header: "Actor",
  }),
  auditTableColumnHelper.accessor((event) => event.detail, {
    id: "detail",
    header: "Detalle",
  }),
  auditTableColumnHelper.accessor((event) => event.ipAddress ?? "", {
    id: "ipAddress",
    header: "IP",
  }),
  auditTableColumnHelper.accessor((event) => event.createdAt.getTime(), {
    id: "createdAt",
    header: "Fecha",
    sortDescFirst: true,
  }),
]);

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getActionIcon(action: string, metadata?: unknown) {
  const eventType = getAuditMetadataEventType(metadata);

  if (eventType === "MEMBER_AUTHORIZED") return LuUserPlus;
  if (eventType === "MEMBER_REVOKED") return LuUserMinus;
  if (eventType === "OTP_RATE_LIMITED") return LuShieldCheck;

  if (action === "OTP_REQUESTED") return LuKeyRound;
  if (action === "FORM_CLONED") return LuFilePlus2;
  if (action === "SENSITIVE_DATA_VIEWED") return LuShieldCheck;
  if (action === "WINNER_SELECTED") return LuTrophy;
  return LuClock3;
}

function getActionStyle(action: string, metadata?: unknown) {
  const eventType = getAuditMetadataEventType(metadata);

  if (eventType === "MEMBER_AUTHORIZED") {
    return {
      badge: "bg-[#16A34A]/10 text-[#16A34A]",
      icon: "text-[#16A34A]",
    };
  }

  if (eventType === "MEMBER_REVOKED") {
    return {
      badge: "bg-[#DC2626]/10 text-[#DC2626]",
      icon: "text-[#DC2626]",
    };
  }

  if (eventType === "OTP_RATE_LIMITED") {
    return {
      badge: "bg-[#CA8A04]/10 text-[#CA8A04]",
      icon: "text-[#CA8A04]",
    };
  }

  if (action === "WINNER_SELECTED") {
    return {
      badge: "bg-[#16A34A]/10 text-[#16A34A]",
      icon: "text-[#16A34A]",
    };
  }

  if (action === "SENSITIVE_DATA_VIEWED") {
    return {
      badge: "bg-[#DC2626]/10 text-[#DC2626]",
      icon: "text-[#DC2626]",
    };
  }

  if (action === "FORM_CLONED") {
    return {
      badge: "bg-sky-100 text-sky-700",
      icon: "text-sky-700",
    };
  }

  if (action === "OTP_REQUESTED") {
    return {
      badge: "bg-violet-100 text-violet-700",
      icon: "text-violet-700",
    };
  }

  if (action === "LOGIN_SESSION_CREATED") {
    return {
      badge: "bg-sky-100 text-sky-700",
      icon: "text-sky-700",
    };
  }

  return {
    badge: "bg-[#F5F5F5] text-[#737373]",
    icon: "text-[#737373]",
  };
}

function getWinnerCount(event: AuditTimelineEvent) {
  if (
    event.action !== "WINNER_SELECTED" ||
    !event.metadata ||
    typeof event.metadata !== "object" ||
    !("winnerCount" in event.metadata)
  ) {
    return null;
  }

  return String((event.metadata as Record<string, unknown>).winnerCount ?? "");
}

function getSearchableEventText(event: AuditTimelineEvent) {
  return [
    event.title,
    event.action,
    event.actor,
    event.detail,
    event.ipAddress,
    event.userAgent,
    formatDate(event.createdAt),
    getWinnerCount(event),
  ]
    .filter(Boolean)
    .join(" ");
}

export function AuditTimeline({ timeline }: Props) {
  const auditTable = useTable({
    features: AUDIT_TABLE_FEATURES,
    data: timeline,
    columns: AUDIT_TABLE_COLUMNS,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.min(10, Math.max(1, timeline.length)),
      },
      sorting: [{ id: "createdAt", desc: true }],
    },
    getColumnCanGlobalFilter: (column) => column.id === "search",
    getRowId: (event: AuditTimelineEvent) => `${event.source}-${event.id}`,
  });
  const visibleHeaders = auditTable
    .getHeaderGroups()[0]
    ?.headers.filter((header) => header.id !== "search") ?? [];
  const paginatedRows = auditTable.getPaginatedRowModel().rows;
  const filteredRowCount = auditTable.getFilteredRowModel().rows.length;
  const searchValue = String(auditTable.state.globalFilter ?? "");

  function handleSearchChange(value: string) {
    auditTable.setPageIndex(0);
    auditTable.setGlobalFilter(value || undefined);
  }

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

  return (
    <section className="mt-8 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      {timeline.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#737373]">
          Todavía no hay eventos de auditoría.
        </div>
      ) : (
        <>
          <div className="border-b border-[#E5E5E5] bg-white px-4 py-3 sm:px-5">
            <label className="block max-w-md">
              <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
                Buscar en auditoría
              </span>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Evento, actor, detalle, IP o navegador"
                className="mt-1 min-h-10 w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition placeholder:text-[#737373] focus:border-[#171717]"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-190 border-collapse lg:min-w-230">
              <colgroup>
                <col className="w-40" />
                <col />
                <col />
                <col className="w-40" />
                <col className="w-55" />
              </colgroup>

              <thead className="bg-[#FBFBFA]">
                {auditTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E5E5E5]"
                  >
                    {headerGroup.headers
                      .filter((header) => header.id !== "search")
                      .map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#737373]"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (() => {
                          const sortDirection = header.column.getIsSorted();
                          const SortIcon = getSortIcon(sortDirection);

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                auditTable.setPageIndex(0);
                                header.column.toggleSorting();
                              }}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                                sortDirection
                                  ? "bg-[#F5F5F5] text-[#171717]"
                                  : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
                              }`}
                              aria-label={`Ordenar por ${String(header.column.columnDef.header)}. ${getSortingLabel(sortDirection)}`}
                            >
                              <auditTable.FlexRender header={header} />
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
                          <auditTable.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleHeaders.length}
                      className="px-5 py-10 text-center text-sm text-[#737373]"
                    >
                      No hay eventos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : paginatedRows.map((row) => {
                  const event = row.original;
                  const Icon =
                    event.action === "LOGIN_SESSION_CREATED"
                      ? LuLogIn
                      : getActionIcon(event.action, event.metadata);
                  const style = getActionStyle(event.action, event.metadata);
                  const winnerCount = getWinnerCount(event);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#E5E5E5] transition-colors last:border-b-0 hover:bg-[#F5F5F5]"
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-2 text-[#171717]">
                          <Icon className={`size-4 shrink-0 ${style.icon}`} />
                          <span
                            className={`inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}
                          >
                            {event.title}
                          </span>
                        </div>
                      </td>

                      <td className="min-w-0 px-4 py-4 align-middle">
                        <p className="truncate text-sm font-medium text-[#171717]">
                          {event.actor}
                        </p>
                        {event.userAgent && (
                          <p className="mt-1 truncate text-xs text-[#737373]">
                            {event.userAgent}
                          </p>
                        )}
                      </td>

                      <td className="min-w-0 px-4 py-4 align-middle">
                        <p className="truncate text-sm font-medium text-[#171717]">
                          {event.detail}
                        </p>
                        {winnerCount && (
                          <p className="mt-1 text-xs text-[#16A34A]">
                            {winnerCount} ganador(es) seleccionados
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle text-xs text-[#737373]">
                        <span className="block truncate">
                          {event.ipAddress ?? "Sin IP"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle text-xs text-[#737373]">
                        {formatDate(event.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {searchValue && (
            <p className="border-t border-[#E5E5E5] px-5 py-2 text-xs text-[#737373]">
              {filteredRowCount} evento(s) encontrados para “{searchValue}”.
            </p>
          )}

          <ResponseTablePagination table={auditTable} />
        </>
      )}
    </section>
  );
}
