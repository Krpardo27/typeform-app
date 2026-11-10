"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { LuClipboardList, LuEllipsis, LuUserPlus } from "react-icons/lu";

const MORE_ROUTES = [
  { href: "/admin/miembros", label: "Miembros", icon: LuUserPlus },
  { href: "/admin/auditoria", label: "Auditoría", icon: LuClipboardList },
];

export function AdminMobileMoreMenu({ pathname }: { pathname: string }) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isActive = MORE_ROUTES.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  function closeMenu(restoreFocus = false) {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    if (restoreFocus) detailsRef.current.querySelector("summary")?.focus();
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && detailsRef.current && !detailsRef.current.contains(event.target)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="group min-w-0"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing && detailsRef.current?.open) {
          event.preventDefault();
          closeMenu(true);
        }
      }}
    >
      <summary
        aria-label="Más opciones de administración"
        aria-controls={`${id}-admin-more`}
        title="Más opciones"
        className={`flex h-full min-h-16 min-w-0 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] leading-4 transition-colors marker:hidden focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none min-[390px]:text-xs [&::-webkit-details-marker]:hidden ${
          isActive
            ? "bg-[#FFF1EB] font-semibold text-[#FF5C35]"
            : "font-medium text-[#595954] hover:bg-[#F5F5F5] hover:text-[#171717]"
        }`}
      >
        <span className="flex size-8 items-center justify-center">
          <LuEllipsis aria-hidden="true" className="size-5 shrink-0" />
        </span>
        <span className="max-w-full text-center tracking-tight">Más</span>
      </summary>

      <nav
        id={`${id}-admin-more`}
        aria-label="Más opciones de administración"
        className="absolute inset-x-0 bottom-full z-50 mb-2 max-h-[min(18rem,calc(100dvh-8rem-env(safe-area-inset-bottom)))] overflow-y-auto overscroll-contain rounded-lg border border-[#E5E5E5] bg-white p-1.5 shadow-lg"
      >
        {MORE_ROUTES.map(({ href, label, icon: Icon }) => {
          const isCurrentPage = pathname === href;
          const active = isCurrentPage || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={isCurrentPage ? "page" : active ? "location" : undefined}
              onNavigate={(event) => {
                closeMenu(isCurrentPage);
                if (isCurrentPage) event.preventDefault();
              }}
              className={`flex min-h-12 min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none ${
                active ? "bg-[#FFF1EB] font-medium text-[#A33116]" : "text-[#595954] hover:bg-[#F5F5F5] hover:text-[#171717]"
              }`}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="min-w-0 wrap-anywhere">{label}</span>
            </Link>
          );
        })}
      </nav>
    </details>
  );
}