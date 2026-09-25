import { createPortal } from "react-dom";
import { LuLoaderCircle } from "react-icons/lu";

type LoaderScreenProps = {
  title: string;
  description: string;
};

export default function LoaderScreen({
  title,
  description,
}: LoaderScreenProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <main
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-2147483647 flex min-h-screen items-center justify-center bg-[#F5F5F5]/95 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
        <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-[#E5E5E5] bg-white text-[#18181B]">
              <LuLoaderCircle className="size-5 animate-spin" />
            </div>

            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-[#171717]">{title}</p>
              <p className="mt-0.5 text-xs text-[#737373]">Redirigiendo</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 text-left">
          <p className="text-sm leading-6 text-[#525252]">{description}</p>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#18181B]" />
          </div>

          <p className="mt-3 text-xs text-[#A3A3A3]">
            Esto tomara solo un momento.
          </p>
        </div>
      </div>
    </main>,
    document.body,
  );
}
