import { createPortal } from "react-dom";
import { FaAward } from "react-icons/fa6";

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
      className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F5] px-3 py-4 sm:px-4"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-linear-to-r from-transparent via-[#F5F5F5] to-transparent" />
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[#FF5C35]/8 blur-3xl sm:h-64 sm:w-64" />
      </div>

      <div className="relative w-full max-w-[22rem] rounded-[1.75rem] border border-[#EAEAEA] bg-[#FFFFFF]/95 p-5 text-center shadow-[0_20px_60px_rgba(17,24,39,0.08)] backdrop-blur-sm sm:max-w-md sm:p-10">
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center sm:mb-8 sm:h-20 sm:w-20">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FF5C35] border-r-[#7C3AED]" />

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#F3F0FF] bg-[linear-gradient(135deg,#FFF4F0_0%,#F6F2FF_100%)] sm:h-14 sm:w-14">
            <FaAward size={22} className="text-[#FF5C35] sm:text-[24px]" />
          </div>
        </div>

        <h1 className="text-[1.7rem] font-semibold tracking-[-0.04em] text-[#111111] sm:text-3xl">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-[#111111]/65 sm:max-w-xs">
          {description}
        </p>

        <p className="mt-4 text-[10px] tracking-[0.18em] text-[#111111]/45 sm:text-xs">
          Redirigiendo...
        </p>
      </div>
    </main>,
    document.body,
  );
}
