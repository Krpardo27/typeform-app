type WorkspaceFormStructurePanelProps = {
  welcomeScreensCount: number;
  thankyouScreensCount: number;
  logicRulesCount: number;
  isPublic: boolean;
};

export function WorkspaceFormStructurePanel({
  welcomeScreensCount,
  thankyouScreensCount,
  logicRulesCount,
  isPublic,
}: WorkspaceFormStructurePanelProps) {
  return (
    <section
      className="
        mt-6
        rounded-2xl
        border border-[#E8E8E6]
        bg-white
        p-5
        shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
      "
    >
      <h2 className="text-base font-semibold text-[#111111]">
        Estructura detectada
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#000000]/45">
            Pantallas de bienvenida
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">
            {welcomeScreensCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#000000]/45">
            Pantallas de agradecimiento
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">
            {thankyouScreensCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#000000]/45">
            Reglas de lógica
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">
            {logicRulesCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#000000]/45">
            Estado
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">
            {isPublic ? "Público" : "Privado"}
          </p>
        </div>
      </div>
    </section>
  );
}
