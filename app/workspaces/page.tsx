import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceSidebar } from "@/features/workspaces/components/WorkspaceSidebar";
import { LuLayoutGrid, LuShieldAlert, LuCompass } from "react-icons/lu";

export default async function WorkSpacePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const allowedUser = await prisma.allowedUser.findFirst({
    where: { email: { equals: session.user.email, mode: "insensitive" } },
  });

  if (!allowedUser) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh bg-[#09090b] text-zinc-100 font-sans antialiased">
      {/* Sidebar Rediseñado */}
      <WorkspaceSidebar user={session.user} />

      {/* Contenedor Principal */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#0c0c0e] px-10 py-8">
        {/* Header de la sección */}
        <header className="border-b border-zinc-800/60 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <LuCompass className="size-3.5 text-[#C8A96E]" />
              <span>Panel de Control de Seguridad</span>
            </div>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
              Workspaces Autorizados
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Acceso Verificado (Resend OTP)
          </div>
        </header>

        {/* Zona de contenido / Estado Vacío Premium */}
        <section className="py-12 flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
          <div className="w-full rounded-2xl border border-zinc-800/80 bg-[#111113] p-8 text-center space-y-4 shadow-xl shadow-black/40">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-[#C8A96E]">
              <LuLayoutGrid className="size-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">
                Ningún Workspace seleccionado
              </h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Por favor, selecciona una marca o radio desde el menú para
                listar tus formularios vinculados de Typeform.
              </p>
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/60">
                <LuShieldAlert className="size-3.5 text-zinc-400" />
                <span>Auditoría de acciones activa en esta sesión</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
