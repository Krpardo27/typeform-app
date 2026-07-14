export function EmptyWorkspaceFormsState() {
  return (
    <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white">Sin formularios</h2>
      <p className="mt-1 max-w-xl text-sm text-zinc-500">
        Typeform no devolvio formularios para este workspace.
      </p>
    </section>
  );
}