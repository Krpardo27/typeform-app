import { LuBadgeCheck } from "react-icons/lu";

type WorkspaceFormCloneNoticeProps = {
  clonedFrom: string;
};

export function WorkspaceFormCloneNotice({
  clonedFrom,
}: WorkspaceFormCloneNoticeProps) {
  return (
    <section className="mt-6 rounded-xl border border-emerald-600/40 bg-emerald-950/20 p-4 text-emerald-100">
      <div className="flex items-start gap-3">
        <LuBadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold">Formulario duplicado correctamente</p>
          <p className="mt-1 text-sm text-emerald-200/80">
            Estás viendo el nuevo formulario clonado. Origen: {clonedFrom}
          </p>
        </div>
      </div>
    </section>
  );
}
