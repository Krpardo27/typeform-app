import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4 py-10">
      <section
        className="
          w-full max-w-md
          rounded-2xl
          border border-[#E8E8E6]
          bg-white
          p-8
          text-center
          shadow-lg
        "
      >
        <div
          className="
            mx-auto mb-6
            flex h-16 w-16 items-center justify-center
            rounded-full
            border border-[#FF5C35]/25
            bg-[#FF5C35]/10
            text-2xl font-semibold
            text-[#FF5C35]
          "
        >
          404
        </div>

        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-black/45">
          Workspace no disponible
        </p>

        <h1 className="mt-3 text-lg font-semibold leading-7 text-[#111111]">
          No tienes acceso a este workspace, o ya no existe.
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#111111]/55">
          Puedes volver a tu lista de espacios o regresar al inicio.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/workspaces/me"
            className="
              inline-flex items-center justify-center
              rounded-xl
              bg-[#FF5C35]
              px-4 py-3
              text-sm font-medium text-white
              shadow-[0_4px_12px_-4px_rgba(255,92,53,0.45)]
              transition-all
              hover:-translate-y-0.5
              hover:opacity-90
            "
          >
            Mis workspaces
          </Link>

          <Link
            href="/"
            className="
              inline-flex items-center justify-center
              rounded-xl
              border border-[#E5E5E3]
              bg-[#FAFAF9]
              px-4 py-3
              text-sm font-medium text-[#111111]/75
              shadow-sm
              transition-all
              hover:-translate-y-0.5
              hover:border-[#D8D8D6]
              hover:bg-white
            "
          >
            Inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
