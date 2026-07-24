import { FaAward } from "react-icons/fa6";

type LoaderScreenProps = {
  title: string;
  description: string;
  badgeText?: string;
};

export default function LoaderScreen({
  title,
  description,
  badgeText = "Verificando acceso",
}: LoaderScreenProps) {
  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-neutral-950 px-4">
      {/* Decoración */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent  to-transparent" />
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-amber-400/15 bg-neutral-900/90 p-10 text-center backdrop-blur-sm">
        {/* Ícono */}
        <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">

          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-amber-400/80" />

          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/5">
            <FaAward
              size={24}
              className="text-amber-300"
            />
          </div>
        </div>

        {/* Estado */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-amber-400/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          {badgeText}
        </div>

        {/* Texto */}
        <h1 className="font-sans text-3xl font-semibold text-white">
          {title}
        </h1>

        <p className="font-mono mx-auto mt-3 max-w-xs text-sm leading-relaxed text-neutral-400">
          {description}
        </p>

        {/* Barra */}
        <div className="mt-8 h-[3px] overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full w-1/3 animate-[sweep_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500" />
        </div>

        <p className="mt-4 text-xs tracking-wide text-neutral-500">
          Redirigiendo...
        </p>
      </div>
    </main>
  );
}