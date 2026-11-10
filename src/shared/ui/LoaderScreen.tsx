"use client";

import { createPortal } from "react-dom";
import { LuArrowRight, LuLogOut } from "react-icons/lu";

export type LoaderScreenVariant = "default" | "logout";

type LoaderScreenProps = {
  title: string;
  description: string;
  variant?: LoaderScreenVariant;
};

export default function LoaderScreen({
  title,
  description,
  variant = "default",
}: LoaderScreenProps) {
  if (typeof document === "undefined") {
    return null;
  }

  const isLogout = variant === "logout";

  return createPortal(
    <div className="fixed inset-0 z-2147483647 flex flex-col overflow-y-auto bg-[#F7F7F6] px-5 text-[#171717] sm:px-10">
      <div className="mx-auto w-full max-w-5xl shrink-0 border-b border-[#D1D1CD] py-6 sm:py-8">
        <p className="border-l-[3px] border-[#FF5C35] pl-3 text-lg leading-tight font-medium tracking-tight sm:text-xl">
          <span className="block">Plataforma de</span>
          <span className="block">Formularios</span>
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center py-16 sm:py-24">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={isLogout
            ? "w-full max-w-md rounded-md border border-[#FF5C35]/40 bg-white p-6 sm:p-8"
            : "w-full max-w-sm"
          }
        >
          {isLogout && (
            <div className="mb-6 flex items-center gap-2.5 text-[#A53318]">
              <LuLogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.6} />
              <p className="text-sm font-medium">Sesión cerrada</p>
            </div>
          )}
          <h2 className="text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#595954]">
            {description}
          </p>

          <div className={isLogout ? "mt-8 border-t border-[#FF5C35]/20 pt-5" : "mt-7"}>
            <p className="flex items-center justify-between gap-3 text-sm leading-5 text-[#595954]">
              <span>{isLogout ? "Volviendo al inicio de sesión" : "Continuarás automáticamente."}</span>
              {isLogout && <LuArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#A53318]" />}
            </p>
            <div aria-hidden="true" className="mt-4 h-0.5 w-full overflow-hidden bg-[#FF5C35]/15">
              <div className="h-full w-1/3 animate-infinite-loading bg-[#FF5C35] motion-reduce:mx-auto motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
