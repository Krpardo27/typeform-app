type Props = {
  count: number;
};

function clampCount(value: number) {
  return Math.max(1, Math.min(value, 24));
}

export function AdminWorkspacesGridSkeleton({ count }: Props) {
  const skeletonCount = clampCount(count);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <article
          key={index}
          className="rounded-xl border border-zinc-800 bg-[#111113] p-5 animate-pulse"
        >
          <div className="h-5 w-2/3 rounded-md bg-zinc-800" />
          <div className="mt-2 h-3 w-1/2 rounded-md bg-zinc-900" />
          <div className="mt-4 h-3 w-full rounded-md bg-zinc-900" />
          <div className="mt-2 h-3 w-5/6 rounded-md bg-zinc-900" />
          <div className="mt-5 h-9 w-28 rounded-lg bg-zinc-800" />
        </article>
      ))}
    </section>
  );
}