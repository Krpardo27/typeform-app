export function EmptyWorkspaceFormsState() {
  return (
    <section className="mt-8 rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[#000000]">Sin formularios</h2>
      <p className="mt-1 max-w-xl text-sm text-[#000000]/55">
        Typeform no devolvio formularios para este workspace.
      </p>
    </section>
  );
}