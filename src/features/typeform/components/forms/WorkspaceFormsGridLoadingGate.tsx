"use client";

import { useEffect, useState, type ReactNode } from "react";

export const WORKSPACE_FORMS_GRID_LOADING_EVENT =
  "workspace-forms-grid-loading";

type WorkspaceFormsGridLoadingGateProps = {
  children: ReactNode;
};

type WorkspaceFormsGridLoadingEventDetail = {
  isLoading: boolean;
};

function WorkspaceFormCardSkeleton() {
  return (
    <article className="rounded-2xl border border-[#E8E8E6] bg-white p-4 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-[#E8E8E6]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[#F0F0EF]" />
          <div className="flex gap-1.5">
            <div className="h-7 w-14 animate-pulse rounded-lg bg-[#F0F0EF]" />
            <div className="h-7 w-20 animate-pulse rounded-lg bg-[#F0F0EF]" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <div className="size-11 animate-pulse rounded-xl bg-[#FFF4F0] sm:size-9" />
          <div className="size-11 animate-pulse rounded-xl bg-[#F7F7F6] sm:size-9" />
        </div>
      </div>

      <div className="mt-5 h-4 w-40 animate-pulse rounded-full bg-[#F0F0EF]" />
      <div className="mt-4 h-8 w-28 animate-pulse rounded-xl bg-[#F7F7F6]" />
    </article>
  );
}

function WorkspaceFormsGridSkeleton() {
  return (
    <section
      aria-label="Cargando formularios"
      className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <WorkspaceFormCardSkeleton key={index} />
      ))}
    </section>
  );
}

export function WorkspaceFormsGridLoadingGate({
  children,
}: WorkspaceFormsGridLoadingGateProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleLoading(event: Event) {
      const customEvent = event as CustomEvent<WorkspaceFormsGridLoadingEventDetail>;
      setIsLoading(Boolean(customEvent.detail?.isLoading));
    }

    window.addEventListener(WORKSPACE_FORMS_GRID_LOADING_EVENT, handleLoading);

    return () => {
      window.removeEventListener(WORKSPACE_FORMS_GRID_LOADING_EVENT, handleLoading);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={
          isLoading
            ? "pointer-events-none opacity-0 transition-opacity"
            : "transition-opacity"
        }
        aria-hidden={isLoading}
      >
        {children}
      </div>

      {isLoading && (
        <div className="absolute inset-x-0 top-0" role="status" aria-live="polite">
          <p className="sr-only">Duplicando formulario y recargando listado.</p>
          <WorkspaceFormsGridSkeleton />
        </div>
      )}
    </div>
  );
}
