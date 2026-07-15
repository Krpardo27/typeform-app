export default function MyWorkspacesLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-12">
      <section
        className="w-full rounded-2xl border border-zinc-800 bg-[#111113] p-8 text-zinc-200 animate-pulse"
        aria-hidden
      >
        <div className="h-3 w-24 rounded-md bg-zinc-800" />
        <div className="mt-4 h-8 w-80 rounded-md bg-zinc-800" />
        <div className="mt-3 h-4 w-full rounded-md bg-zinc-900" />
        <div className="mt-2 h-4 w-11/12 rounded-md bg-zinc-900" />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="h-10 w-28 rounded-lg bg-zinc-800" />
          <div className="h-10 w-36 rounded-lg bg-zinc-900" />
        </div>
      </section>
    </main>
  );
}