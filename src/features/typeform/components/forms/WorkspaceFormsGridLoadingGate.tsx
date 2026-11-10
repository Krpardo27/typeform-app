"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

type WorkspaceFormsGridLoadingGateProps = {
  children: ReactNode;
};

type GridOperation = {
  busy: boolean;
  acquire: () => boolean;
  release: () => void;
  run: <T>(task: () => Promise<T>) => Promise<T>;
};

const GridOperationContext = createContext<GridOperation | null>(null);

export function useWorkspaceFormsGridOperation() {
  return useContext(GridOperationContext);
}

function WorkspaceFormCardSkeleton() {
  return (
    <article className="flex min-w-0 animate-pulse flex-col rounded-md border border-[#FF5C35]/30 bg-white p-4 motion-reduce:animate-none sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-5 w-4/5 rounded-sm bg-[#E8E8E6]" />
          <div className="h-5 w-full rounded-sm bg-[#E8E8E6]" />
          <div className="h-4 w-24 max-w-full rounded-sm bg-[#F0F0EF]" />
        </div>

        <div className="size-11 shrink-0 rounded-md bg-[#FFF1EC]" />
      </div>

      <div className="mt-5 h-4 w-32 max-w-full rounded-sm bg-[#F0F0EF]" />
      <div className="mt-2 h-4 w-40 max-w-full rounded-sm bg-[#F0F0EF]" />
      <div className="mt-5 space-y-3 border-t border-[#E8E8E6] pt-4">
        <div className="h-11 w-full rounded-md bg-[#FFF1EC]" />
        <div className="h-11 w-32 max-w-full rounded-sm bg-[#F0F0EF]" />
        <div className="flex gap-4 border-t border-[#E8E8E6] pt-3">
          <div className="h-6 w-20 max-w-full rounded-sm bg-[#F0F0EF]" />
          <div className="h-6 w-20 max-w-full rounded-sm bg-[#F0F0EF]" />
        </div>
      </div>
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
  const [reserved, setReserved] = useState(false);
  const lock = useRef(false);
  const transitionActive = useRef(false);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    transitionActive.current = isLoading;
    if (!isLoading && !reserved) lock.current = false;
  }, [isLoading, reserved]);

  function acquire() {
    if (lock.current) return false;
    lock.current = true;
    setReserved(true);
    return true;
  }

  function release() {
    setReserved(false);
    if (!transitionActive.current) lock.current = false;
  }

  function run<T>(task: () => Promise<T>): Promise<T> {
    transitionActive.current = true;
    return new Promise<T>((resolve, reject) => {
      startTransition(async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  return (
    <GridOperationContext value={{ busy: reserved || isLoading, acquire, release, run }}>
    <div className="relative" aria-busy={isLoading}>
      <div
        inert={isLoading}
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
    </GridOperationContext>
  );
}
