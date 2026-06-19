import { LuLoaderCircle, LuShieldCheck } from "react-icons/lu";

type AppLoaderProps = {
  isOpen: boolean;
  title: string;
  description?: string;
};

export function AppLoader({ isOpen, title, description }: AppLoaderProps) {
  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-[#111113] p-6 text-center shadow-2xl shadow-black/80 ring-1 ring-white/5 animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl border border-[#C8A96E]/30 bg-[#C8A96E]/10 text-[#C8A96E] shadow-lg shadow-[#C8A96E]/5">
          <div className="relative grid size-10 place-items-center">
            <LuLoaderCircle className="absolute inset-0 size-10 animate-spin text-[#C8A96E]" />
            <LuShieldCheck className="size-5 text-[#C8A96E]/90" />
          </div>
        </div>

        <h2 className="text-base font-semibold text-white tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        ) : null}

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-zinc-900">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#C8A96E] to-transparent animate-infinite-loading" />
        </div>
      </div>
    </div>
  );
}
