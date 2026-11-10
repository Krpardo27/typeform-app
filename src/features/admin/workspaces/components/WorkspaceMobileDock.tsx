"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";
import { LuChevronDown, LuFileText, LuLayoutDashboard } from "react-icons/lu";
import { LogoutButton } from "@/shared/components/LogoutButton";
import { WorkspaceRadioLogo } from "./WorkspaceRadioLogo";

type WorkspaceMobileDockProps = {
  workspaces: {
    id: string;
    name: string;
    typeformId?: string;
    templateFormTypeformId?: string | null;
  }[];
  currentWorkspaceId?: string;
  currentSection?: "home" | "forms";
};

const workspaceNavItems = [
  { label: "Inicio", href: "", icon: LuLayoutDashboard, section: "home" },
  { label: "Formularios", href: "forms", icon: LuFileText, section: "forms" },
] as const;

export function WorkspaceMobileDock({
  workspaces,
  currentWorkspaceId,
  currentSection,
}: WorkspaceMobileDockProps) {
  const pathname = usePathname()?.replace(/\/$/, "") ?? "";
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );
  const hasSingleWorkspace =
    workspaces.length === 1 && Boolean(currentWorkspace);
  const currentRadio = {
    name: currentWorkspace?.name ?? "Radios",
    typeformId: currentWorkspace?.typeformId ?? currentWorkspace?.id ?? "",
    templateFormTypeformId: currentWorkspace?.templateFormTypeformId,
  };

  const workspaceHomeHref = currentWorkspaceId
    ? `/workspaces/${currentWorkspaceId}`
    : "/workspaces/me";

  const formsHref = `${workspaceHomeHref}/forms`;
  const responsesHref = `${workspaceHomeHref}/responses`;
  const isHomeActive = pathname
    ? pathname === workspaceHomeHref
    : currentSection === "home";
  const isFormsActive =
    Boolean(currentWorkspaceId) &&
    (pathname
      ? pathname === formsHref ||
        pathname.startsWith(`${formsHref}/`) ||
        pathname === responsesHref ||
        pathname.startsWith(`${responsesHref}/`)
      : currentSection === "forms");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        detailsRef.current &&
        !detailsRef.current.contains(event.target)
      ) {
        detailsRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function closeWorkspaceMenu(restoreFocus = false) {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    if (restoreFocus) detailsRef.current.querySelector("summary")?.focus();
  }

  const navItems = currentWorkspaceId
    ? workspaceNavItems.map((item) => ({
        ...item,
        active: item.section === "home" ? isHomeActive : isFormsActive,
      }))
    : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="relative mx-auto w-full max-w-xl rounded-xl border border-[#E5E5E5] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <nav
          aria-label="Navegación del workspace"
          className={`grid gap-1 p-1.5 ${currentWorkspaceId ? "grid-cols-4" : "grid-cols-2"}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            const href = item.href
              ? `/workspaces/${currentWorkspaceId}/${item.href}`
              : workspaceHomeHref;

            return (
              <Link
                key={item.label}
                href={href}
                aria-current={
                  pathname === href
                    ? "page"
                    : item.active
                      ? "location"
                      : undefined
                }
                onNavigate={(event) => {
                  closeWorkspaceMenu();
                  if (pathname === href) event.preventDefault();
                }}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none min-[390px]:text-sm ${
                  item.active
                    ? "bg-[#FFF1EB] font-semibold text-[#FF5C35]"
                    : "font-medium text-[#595954] hover:bg-[#F5F5F5] hover:text-[#171717]"
                }`}
              >
                <span className="flex size-8 items-center justify-center">
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                </span>
                <span className="max-w-full text-center">{item.label}</span>
              </Link>
            );
          })}

          {hasSingleWorkspace ? (
            <div
              role="img"
              aria-label={`Radio actual: ${currentRadio.name}`}
              title={currentRadio.name}
              className="flex min-h-16 min-w-0 items-center justify-center rounded-lg px-1 py-1"
            >
              <WorkspaceRadioLogo
                workspace={currentRadio}
                size={64}
                alt=""
                fallback="icon"
              />
            </div>
          ) : (
            <details
              key={pathname}
              ref={detailsRef}
              onBlur={(event) => {
                // Tocar texto no enfocable deja relatedTarget en null. El cierre
                // por pulsaciones fuera del menú ya lo gestiona pointerdown.
                if (
                  event.relatedTarget &&
                  !event.currentTarget.contains(event.relatedTarget)
                )
                  closeWorkspaceMenu();
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  !event.nativeEvent.isComposing &&
                  detailsRef.current?.open
                ) {
                  event.preventDefault();
                  closeWorkspaceMenu(true);
                }
              }}
              className="group min-w-0"
            >
              <summary
                aria-label={
                  currentWorkspace
                    ? `Cambiar radio. Actual: ${currentWorkspace.name}`
                    : "Elegir radio"
                }
                aria-controls={`${id}-radio-menu`}
                title={currentWorkspace?.name ?? "Elegir radio"}
                className="flex min-h-16 min-w-0 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-sm font-medium leading-4 text-[#595954] transition-colors marker:hidden hover:bg-[#F5F5F5] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none min-[390px]:text-sm [&::-webkit-details-marker]:hidden"
              >
                <WorkspaceRadioLogo
                  workspace={currentRadio}
                  size={64}
                  alt=""
                  fallback="icon"
                />
                <LuChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>

              <nav
                id={`${id}-radio-menu`}
                aria-label="Cambiar radio"
                className="absolute inset-x-0 bottom-full z-50 mb-2 max-h-[min(20rem,calc(100dvh-10rem-env(safe-area-inset-bottom)))] overflow-y-auto overscroll-contain rounded-lg border border-[#E5E5E5] bg-white p-1.5 shadow-lg"
              >
                <p className="px-3 py-2 text-sm font-medium text-[#737373]">
                  Tus radios
                </p>
                {workspaces.length === 0 && (
                  <p className="px-3 py-4 text-sm text-[#595954]">
                    No tienes radios asignadas.
                  </p>
                )}
                {workspaces.map((workspace) => {
                  const isActive = currentWorkspaceId === workspace.id;
                  const href = `/workspaces/${workspace.id}`;

                  return (
                    <Link
                      key={workspace.id}
                      href={href}
                      prefetch={false}
                      aria-current={isActive ? "location" : undefined}
                      title={workspace.name}
                      onNavigate={(event) => {
                        const isCurrentPage = pathname === href;
                        closeWorkspaceMenu(isCurrentPage);
                        if (isCurrentPage) event.preventDefault();
                      }}
                      className={`flex min-h-12 min-w-0 items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none ${
                        isActive
                          ? "bg-[#FFF1EB] font-medium text-[#A33116]"
                          : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
                      }`}
                    >
                      <WorkspaceRadioLogo
                        workspace={{
                          ...workspace,
                          typeformId: workspace.typeformId ?? workspace.id,
                        }}
                        size={64}
                        alt=""
                        fallback="icon"
                      />
                      <span className="min-w-0 flex-1 wrap-anywhere leading-5">
                        {workspace.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </details>
          )}

          <div className="min-w-0 [&>button]:w-full [&>button]:min-w-0">
            <LogoutButton variant="workspace-dock" />
          </div>
        </nav>
      </div>
    </div>
  );
}
