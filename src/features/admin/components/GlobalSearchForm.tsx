"use client";

import {
  type GlobalSearchResult,
  type FormSearchResult,
  type ParticipantSearchResult,
} from "@/features/admin/actions/search-action";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuLoader, LuSearch, LuUserRound, LuRadio, LuFileText, LuTrophy } from "react-icons/lu";

interface Props {
  onResults?: (results: GlobalSearchResult | null) => void;
  placeholder?: string;
  debounceMs?: number;
  minLength?: number;
  workspaceHrefMode?: "admin" | "workspaces";
  currentWorkspaceId?: string;
  includeForms?: boolean;
}

export default function GlobalSearchForm({
  onResults,
  placeholder = "Buscar usuarios autorizados o workspaces...",
  debounceMs = 300,
  minLength = 2,
  workspaceHrefMode,
  currentWorkspaceId,
  includeForms = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const query = search.trim();
  const showPanel = isOpen && query.length >= minLength;
  const effectiveWorkspaceHrefMode =
    workspaceHrefMode ??
    (pathname?.startsWith("/workspaces") ? "workspaces" : "admin");
  const responseRouteMatch = pathname?.match(
    /^\/workspaces\/([^/]+)\/forms\/([^/]+)\/responses\/?$/,
  );
  const currentResponseWorkspaceId = responseRouteMatch?.[1];
  const currentResponseFormId = responseRouteMatch?.[2];

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return (
      results.workspaces.length +
      results.authorizedUsers.length +
      results.forms.length +
      results.participants.length
    );
  }, [results]);

  const searchableItems = useMemo(() => {
    if (!results) return [] as Array<{ id: string; href: string }>;

    const workspaceItems = results.workspaces.map((workspace) => ({
      id: `workspace:${workspace.id}`,
      href:
        effectiveWorkspaceHrefMode === "workspaces"
          ? `/workspaces/${workspace.id}`
          : `/admin/workspaces/${workspace.typeformId}`,
    }));

    const userItems = results.authorizedUsers
      .filter((allowedUser) => Boolean(allowedUser.user?.id))
      .map((allowedUser) => ({
        id: `user:${allowedUser.id}`,
        href: `/admin/users/${allowedUser.user!.id}`,
      }));

    const formItems = results.forms.map((form) => ({
      id: `form:${form.id}`,
      href: `/workspaces/${form.workspaceId}/forms/${form.id}`,
    }));

    const participantItems = results.participants.map((participant) => ({
      id: `participant:${participant.token}`,
      href: `/workspaces/${participant.workspaceId}/forms/${participant.formId}/responses`,
    }));

    return [...workspaceItems, ...formItems, ...participantItems, ...userItems];
  }, [effectiveWorkspaceHrefMode, results]);

  useEffect(() => {
    let isCancelled = false;

    if (query.length < minLength) {
      onResults?.(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/search?${new URLSearchParams({
            q: query,
            ...(includeForms && currentWorkspaceId
              ? {
                  includeForms: "1",
                  workspaceId: currentWorkspaceId,
                }
              : {}),
            ...(currentResponseWorkspaceId && currentResponseFormId
              ? {
                  includeParticipants: "1",
                  workspaceId: currentResponseWorkspaceId,
                  formId: currentResponseFormId,
                }
              : {}),
          }).toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.message ?? "No se pudo ejecutar la búsqueda",
          );
        }

        const result = payload.data as GlobalSearchResult;

        if (isCancelled) return;

        setResults(result);
        setActiveIndex(-1);
        onResults?.(result);
      } catch (err) {
        if (isCancelled) return;
        const message =
          err instanceof Error ? err.message : "No se pudo ejecutar la búsqueda";
        setError(message);
        setResults(null);
        setActiveIndex(-1);
        onResults?.(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [
    debounceMs,
    currentResponseFormId,
    currentResponseWorkspaceId,
    currentWorkspaceId,
    effectiveWorkspaceHrefMode,
    includeForms,
    minLength,
    onResults,
    query,
  ]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSelectResult() {
    setIsOpen(false);
    setSearch("");
    setResults(null);
    setError(null);
    setActiveIndex(-1);
    onResults?.(null);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel || searchableItems.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchableItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? searchableItems.length - 1 : prev - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex < 0 || activeIndex >= searchableItems.length) {
        return;
      }

      event.preventDefault();
      const item = searchableItems[activeIndex];
      if (!item) return;

      handleSelectResult();
      router.push(item.href);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          autoComplete="off"
          aria-label="Buscador global"
          className="w-full rounded-lg border border-[#dedede]/10 bg-[#111113] py-2 pl-9 pr-4 outline-none transition focus:border-[#C8A96E]/50"
        />
      </div>

      {showPanel && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#111113] shadow-2xl shadow-black/40">
          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-400">
              <LuLoader className="size-4 animate-spin" />
              Buscando...
            </div>
          )}

          {!isLoading && error && (
            <div className="px-4 py-3 text-sm text-rose-400">{error}</div>
          )}

          {!isLoading && !error && results && (
            <div className="max-h-96 overflow-y-auto">
              {results.workspaces.length > 0 && (
                <div className="border-b border-zinc-800/70 p-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Workspaces
                  </p>
                  <ul className="space-y-1">
                    {results.workspaces.map((workspace) => (
                      <li key={workspace.id}>
                        <Link
                          href={
                            effectiveWorkspaceHrefMode === "workspaces"
                              ? `/workspaces/${workspace.id}`
                              : `/admin/workspaces/${workspace.typeformId}`
                          }
                          onClick={handleSelectResult}
                          onMouseEnter={() => {
                            const index = searchableItems.findIndex(
                              (item) => item.id === `workspace:${workspace.id}`,
                            );
                            setActiveIndex(index);
                          }}
                          className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 ${
                            searchableItems[activeIndex]?.id ===
                            `workspace:${workspace.id}`
                              ? "bg-zinc-900"
                              : ""
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <LuRadio className="size-4 shrink-0 text-[#C8A96E]" />
                            <span className="truncate">{workspace.name}</span>
                          </span>
                          <span className="ml-2 shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                            {workspace.role}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.forms.length > 0 && (
                <div className="border-b border-zinc-800/70 p-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Formularios
                  </p>
                  <ul className="space-y-1">
                    {results.forms.map((form: FormSearchResult) => (
                      <li key={form.id}>
                        <Link
                          href={`/workspaces/${form.workspaceId}/forms/${form.id}`}
                          onClick={handleSelectResult}
                          onMouseEnter={() => {
                            const index = searchableItems.findIndex(
                              (item) => item.id === `form:${form.id}`,
                            );
                            setActiveIndex(index);
                          }}
                          className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 ${
                            searchableItems[activeIndex]?.id === `form:${form.id}`
                              ? "bg-zinc-900"
                              : ""
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <LuFileText className="size-4 shrink-0 text-[#C8A96E]" />
                            <span className="truncate">{form.title}</span>
                          </span>
                          <span className="ml-2 shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                            {form.id}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.participants.length > 0 && (
                <div className="border-b border-zinc-800/70 p-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Participantes y ganadores
                  </p>
                  <ul className="space-y-1">
                    {results.participants.map((participant: ParticipantSearchResult) => (
                      <li key={participant.token}>
                        <Link
                          href={`/workspaces/${participant.workspaceId}/forms/${participant.formId}/responses`}
                          onClick={handleSelectResult}
                          onMouseEnter={() => {
                            const index = searchableItems.findIndex(
                              (item) => item.id === `participant:${participant.token}`,
                            );
                            setActiveIndex(index);
                          }}
                          className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 ${
                            searchableItems[activeIndex]?.id ===
                            `participant:${participant.token}`
                              ? "bg-zinc-900"
                              : ""
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <LuUserRound className="size-4 shrink-0 text-[#C8A96E]" />
                            <span className="truncate">{participant.label}</span>
                          </span>
                          <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                            {participant.isWinner && <LuTrophy className="size-3 text-[#C8A96E]" />}
                            {participant.detail}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.authorizedUsers.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Usuarios autorizados
                  </p>
                  <ul className="space-y-1">
                    {results.authorizedUsers.map((allowedUser) => (
                      <li key={allowedUser.id}>
                        {allowedUser.user ? (
                          <Link
                            href={`/admin/users/${allowedUser.user.id}`}
                            onClick={handleSelectResult}
                            onMouseEnter={() => {
                              const index = searchableItems.findIndex(
                                (item) => item.id === `user:${allowedUser.id}`,
                              );
                              setActiveIndex(index);
                            }}
                            className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 ${
                              searchableItems[activeIndex]?.id ===
                              `user:${allowedUser.id}`
                                ? "bg-zinc-900"
                                : ""
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <LuUserRound className="size-4 shrink-0 text-[#C8A96E]" />
                              <span className="truncate">{allowedUser.email}</span>
                            </span>
                            <span className="ml-2 shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                              {allowedUser.user.globalRole}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300">
                            <span className="flex min-w-0 items-center gap-2">
                              <LuUserRound className="size-4 shrink-0 text-zinc-500" />
                              <span className="truncate">{allowedUser.email}</span>
                            </span>
                            <span className="ml-2 shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">
                              Sin cuenta
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {totalResults === 0 && (
                <div className="px-4 py-4 text-sm text-zinc-500">
                  No se encontraron resultados para {"\""}{query}{"\""}.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}