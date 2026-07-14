import Link from "next/link";
import { LuArrowLeft, LuFilePlus2 } from "react-icons/lu";

type Props = {
  workspaceId: string;
  workspaceName: string;
};

export function NewWorkspaceFormHeader({ workspaceId, workspaceName }: Props) {
  return (
    <header className="border-b border-zinc-800/60 pb-6">
      <Link
        href={`/workspaces/${workspaceId}/forms`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-[#C8A96E]"
      >
        <LuArrowLeft className="size-4" />
        Volver a formularios
      </Link>

      <div className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <LuFilePlus2 className="size-3.5 text-[#C8A96E]" />
        <span className="truncate">{workspaceName}</span>
      </div>

      <h1 className="mt-2 text-2xl font-bold text-white">Crear formulario</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Puedes usar cualquier formulario como base para crear una nueva version.
      </p>
    </header>
  );
}