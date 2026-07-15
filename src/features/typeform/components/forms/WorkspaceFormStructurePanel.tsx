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
    <section className="mt-6 rounded-xl border border-zinc-800 bg-[#111113] p-5">
      <h2 className="text-base font-semibold text-white">Estructura detectada</h2>
      <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          Pantallas de bienvenida: {welcomeScreensCount}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          Pantallas de agradecimiento: {thankyouScreensCount}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          Reglas de logica: {logicRulesCount}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          Estado: {isPublic ? "Publico" : "Privado"}
        </div>
      </div>
    </section>
  );
}
