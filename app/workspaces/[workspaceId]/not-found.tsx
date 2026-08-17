import Link from "next/link";

export default function WorkspaceNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-[#F1F1F0] bg-white p-8 text-center shadow-[0_18px_50px_rgba(17,24,39,0.06)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#FF5C35]/20 bg-[#FF5C35]/10 text-2xl font-semibold text-[#FF5C35]">
          404
        </div>

        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#000000]/45">
          Workspace no encontrado
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
          Este workspace no está disponible
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#111111]/65">
          Puede que no tengas permisos para acceder a este espacio o que ya no
          esté asignado a tu cuenta.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/workspaces/me"
            className="inline-flex items-center justify-center rounded-xl bg-[#FF5C35] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Volver a mis workspaces
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#F0F0F0] bg-[#F7F7F5] px-4 py-3 text-sm font-medium text-[#111111]/75 transition hover:border-[#E5E5E5] hover:bg-[#F2F2F1]"
          >
            Inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
