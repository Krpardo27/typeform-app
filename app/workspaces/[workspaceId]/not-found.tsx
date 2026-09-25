import Link from "next/link";
import {
  LuArrowRight,
  LuBriefcaseBusiness,
  LuHouse,
} from "react-icons/lu";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function WorkspaceNotFoundPage() {
  const user = await getCurrentUser();
  const homeHref = user?.globalRole === "SUPER_ADMIN"
    ? "/admin/workspaces"
    : "/workspaces/me";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-10 text-[#18181B]">
      <section className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[#E4E4E7] bg-white text-[#71717A] shadow-sm">
            <LuBriefcaseBusiness className="size-6" strokeWidth={1.7} />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#71717A]">
            <span className="size-1.5 rounded-full bg-[#A1A1AA]" />
            Workspace no disponible
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[#18181B] sm:text-4xl">
            No puedes acceder a este workspace
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#71717A]">
            El workspace puede no existir, haber sido eliminado o no estar
            asignado a tu cuenta.
          </p>
        </div>

        {/* Information card */}
        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="border-b border-[#E4E4E7] px-5 py-4 sm:px-6">
            <p className="text-sm font-medium text-[#18181B]">
              ¿Qué puedes hacer?
            </p>

            <p className="mt-1 text-xs text-[#A1A1AA]">
              Revisa tus workspaces disponibles o vuelve al inicio.
            </p>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {/* Workspaces */}
            <Link
              href="/workspaces/me"
              className="
                group flex min-h-24 flex-col justify-between
                rounded-xl border border-[#18181B]
                bg-[#18181B] p-4 text-white
                transition
                hover:bg-[#27272A]
                focus:outline-none
                focus:ring-2
                focus:ring-[#18181B]/20
                focus:ring-offset-2
              "
            >
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <LuBriefcaseBusiness className="size-4" />
                </div>

                <LuArrowRight className="size-4 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              </div>

              <div>
                <p className="text-sm font-semibold">Mis workspaces</p>

                <p className="mt-0.5 text-xs text-white/55">
                  Revisar accesos disponibles
                </p>
              </div>
            </Link>

            {/* Home */}
            <Link
              href={homeHref}
              className="
                group flex min-h-24 flex-col justify-between
                rounded-xl border border-[#E4E4E7]
                bg-white p-4
                transition
                hover:border-[#D4D4D8]
                hover:bg-[#FAFAFA]
                focus:outline-none
                focus:ring-2
                focus:ring-[#18181B]/10
                focus:ring-offset-2
              "
            >
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#F4F4F5]">
                  <LuHouse
                    className="size-4 text-[#71717A]"
                    strokeWidth={1.8}
                  />
                </div>

                <LuArrowRight className="size-4 text-[#A1A1AA] transition-transform group-hover:translate-x-0.5 group-hover:text-[#18181B]" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#18181B]">Panel</p>

                <p className="mt-0.5 text-xs text-[#A1A1AA]">
                  Abrir destino principal
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
