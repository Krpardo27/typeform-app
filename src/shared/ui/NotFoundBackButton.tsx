"use client";

import { useRouter } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { canNavigateBackWithinApp } from "./not-found-navigation";

type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries: () => { url?: string | null }[];
};

export default function NotFoundBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function handleBack() {
    // history.length también incluye entradas futuras o de otros sitios.
    // Si el navegador no permite inspeccionar la anterior, usar el destino conocido.
    const navigation = (window as Window & { navigation?: NavigationHistory }).navigation;
    const currentIndex = navigation?.currentEntry?.index ?? -1;
    const previousUrl = navigation && currentIndex > 0
      ? navigation.entries()[currentIndex - 1]?.url
      : undefined;

    if (canNavigateBackWithinApp(window.location.href, previousUrl ?? undefined)) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Volver a la página anterior o al inicio"
      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#D1D1CD] px-4 py-3 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
    >
      <LuArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      Volver
    </button>
  );
}