import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

export default function WorkspaceNotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F5F5F5] px-4 py-10 text-[#171717]">
      <section className="w-full max-w-md">
        <h1 className="text-xl font-semibold">No puedes acceder a este workspace</h1>

        <p className="mt-2 text-sm leading-6 text-[#525252]">
          El workspace puede no existir, haber sido eliminado o no estar asignado a tu cuenta.
        </p>

        {/* /workspaces/me redirige según el rol del usuario. */}
        <Link
          href="/workspaces/me"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717]"
        >
          <LuArrowLeft aria-hidden="true" className="size-4" />
          Volver a mis workspaces
        </Link>
      </section>
    </main>
  );
}
