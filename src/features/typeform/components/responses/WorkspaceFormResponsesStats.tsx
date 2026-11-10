type WorkspaceFormResponsesStatsProps = {
  totalParticipants: number;
  selectedWinnersCount: number;
};

export function WorkspaceFormResponsesStats({
  totalParticipants,
  selectedWinnersCount,
}: WorkspaceFormResponsesStatsProps) {
  const numberFormat = new Intl.NumberFormat("es-CL");
  const stats = [
    {
      label: "Participantes",
      value: totalParticipants,
    },
    {
      label: "Ganadores seleccionados",
      value: selectedWinnersCount,
    },
  ];

  return (
    <section aria-label="Resumen de participantes" className="mt-6 sm:mt-8">
      <dl className="grid max-w-xl grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-0 flex-col rounded-lg border border-[#E5E5E5] bg-white p-4"
          >
            <dt className="min-h-10 text-sm font-medium leading-5 text-[#595954] sm:min-h-0">
              {stat.label}
            </dt>
            <dd className="mt-3 text-2xl font-semibold leading-none tracking-tight text-[#171717] tabular-nums">
              {numberFormat.format(stat.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
