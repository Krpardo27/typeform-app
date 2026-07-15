import { LuShieldCheck } from "react-icons/lu";

type WorkspaceFormResponsesStatsProps = {
  totalParticipants: number;
  shownParticipants: number;
  maskedAnswerCount: number;
};

export function WorkspaceFormResponsesStats({
  totalParticipants,
  shownParticipants,
  maskedAnswerCount,
}: WorkspaceFormResponsesStatsProps) {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Participantes
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{totalParticipants}</p>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Mostrados
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{shownParticipants}</p>
      </article>

      <article className="rounded-xl border border-[#C8A96E]/40 bg-[#15130e] p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C8A96E]">
          <LuShieldCheck className="size-3.5" />
          <span>Proteccion activa</span>
        </div>
        <p className="mt-3 text-2xl font-bold text-white">{maskedAnswerCount}</p>
        <p className="mt-1 text-xs text-zinc-500">Campos ocultados</p>
      </article>
    </section>
  );
}
