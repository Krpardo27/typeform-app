type WorkspaceFormResponsesStatsProps = {
  totalParticipants: number;
  shownParticipants: number;
  selectedWinnersCount: number;
};

const CARD_CLASSNAME =
  "rounded-2xl border border-[#E8E8E6] bg-white p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]";

export function WorkspaceFormResponsesStats({
  totalParticipants,
  shownParticipants,
  selectedWinnersCount,
}: WorkspaceFormResponsesStatsProps) {
  return (
    <section className="lg:mt-8 grid gap-4 md:grid-cols-3">
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

      <article className={CARD_CLASSNAME}>
        <p className="text-xs font-medium uppercase tracking-wider text-[#000000]/45">
          Ganadores seleccionados
        </p>

        <p className="mt-3 text-2xl font-bold text-[#111111]">
          {selectedWinnersCount}
        </p>
      </article>
    </section>
  );
}