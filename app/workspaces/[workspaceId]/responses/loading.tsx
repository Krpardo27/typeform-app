export default function WorkspaceResponsesRedirectLoading() {
  return (
    <div className="grid min-h-[40vh] place-items-center" aria-hidden>
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#111113] p-6 animate-pulse">
        <div className="h-5 w-44 rounded-md bg-zinc-800" />
        <div className="mt-3 h-4 w-full rounded-md bg-zinc-900" />
        <div className="mt-2 h-4 w-3/4 rounded-md bg-zinc-900" />
      </div>
    </div>
  );
}