import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { getCurrentUser } from "@/lib/getCurrentUser";
import NotFoundBackButton from "@/shared/ui/NotFoundBackButton";

export default async function NotFoundPage() {
  const user = await getCurrentUser();
  const panelHref = !user
    ? "/auth/login"
    : user.globalRole === "SUPER_ADMIN"
      ? "/admin/workspaces"
      : "/workspaces/me";
  const panelLabel = !user
    ? "Iniciar sesión"
    : user.globalRole === "SUPER_ADMIN"
      ? "Ir a administración"
      : "Ir a mis workspaces";

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F7F6] px-5 text-[#171717] sm:px-10">
      <header className="mx-auto w-full max-w-5xl border-b border-[#D1D1CD] py-6 sm:py-8">
        <p className="border-l-[3px] border-[#FF5C35] pl-3 text-lg leading-tight font-medium tracking-tight sm:text-xl">
          <span className="block">Plataforma de</span>
          <span className="block">Formularios</span>
        </p>
      </header>

      <main className="flex flex-1 items-center justify-center py-10 sm:py-16">
        <section aria-labelledby="not-found-title" className="w-full max-w-lg rounded-md border border-[#FF5C35]/40 bg-white p-6 sm:p-8">
          <p className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-5 text-[#595954]">
            <span className="font-semibold text-[#A53318] tabular-nums">Error 404</span>
            <span>Ruta no encontrada</span>
          </p>
          <h1 id="not-found-title" className="max-w-sm text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
            No encontramos esta página
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#595954]">
            El enlace puede estar incompleto o la página haber cambiado de dirección.
            Revisa la URL o continúa desde tu inicio.
          </p>

          <nav aria-label="Opciones para continuar" className="mt-7 flex flex-col gap-3 border-t border-[#FF5C35]/20 pt-6 sm:flex-row sm:flex-wrap">
            <Link
              href={panelHref}
              className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#FF5C35] px-4 py-3 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#171717] motion-reduce:transition-none"
            >
              {panelLabel}
              <LuArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
            <NotFoundBackButton fallbackHref={panelHref} />
          </nav>
        </section>
      </main>
    </div>
  );
}
