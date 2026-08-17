import { LuShieldCheck } from "react-icons/lu";

type WorkspaceFormResponsesStatsProps = {
  totalParticipants: number;
  shownParticipants: number;
  maskedAnswerCount: number;
};

const CARD_CLASSNAME =
  "rounded-2xl border border-[#E8E8E6] bg-white p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]";

export function WorkspaceFormResponsesStats({
  totalParticipants,
  shownParticipants,
  maskedAnswerCount,
}: WorkspaceFormResponsesStatsProps) {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <article className={CARD_CLASSNAME}>
        <p className="text-xs font-medium uppercase tracking-wider text-[#000000]/45">
          Participantes
        </p>

        <p className="mt-3 text-2xl font-bold text-[#111111]">
          {totalParticipants}
        </p>
      </article>

      <article className={CARD_CLASSNAME}>
        <p className="text-xs font-medium uppercase tracking-wider text-[#000000]/45">
          Mostrados
        </p>

        <p className="mt-3 text-2xl font-bold text-[#111111]">
          {shownParticipants}
        </p>
      </article>

      <article
        className="
          rounded-2xl
          border border-[#00BFA5]/25
          bg-[#00BFA5]/[0.06]
          p-5
          shadow-[0_8px_30px_-18px_rgba(0,191,165,0.22)]
        "
      >
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#00A88F]">
          <LuShieldCheck className="size-3.5" />
          <span>Protección activa</span>
        </div>

        <p className="mt-3 text-2xl font-bold text-[#111111]">
          {maskedAnswerCount}
        </p>

        <p className="mt-1 text-xs text-[#000000]/55">
          Campos ocultados
        </p>
      </article>
    </section>
  );
}