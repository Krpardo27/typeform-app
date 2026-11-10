type Props = {
  count: number;
  label?: string;
  variant?: "workspace" | "form";
  announce?: boolean;
};

function clampCount(value: number) {
  return Math.max(1, Math.min(Number.isFinite(value) ? Math.floor(value) : 4, 48));
}

export function AdminWorkspacesGridSkeleton({ count, label, variant = "workspace", announce = true }: Props) {
  const skeletonCount = clampCount(count);

  return (
    <div className="relative min-w-0">
      {announce && <p role="status" className="sr-only">{label ?? (variant === "form" ? "Cargando formularios." : "Cargando workspaces.")}</p>}
      <section className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ${variant === "form" ? "gap-4" : "gap-3 sm:gap-4"}`} aria-hidden="true">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <article key={index} className={`min-w-0 animate-pulse rounded-md border border-[#FF5C35]/30 bg-white motion-reduce:animate-none ${variant === "form" ? "p-5" : "p-4 sm:p-5"}`}>
            {variant === "workspace" && <div className="mb-3 size-20 rounded-sm bg-[#F0F0ED]" />}
            <div className="h-5 w-5/6 rounded-sm bg-[#E5E5E5]" />
            <div className="mt-2 h-5 w-2/3 rounded-sm bg-[#E5E5E5]" />
            <div className="mt-3 h-4 w-1/2 rounded-sm bg-[#F0F0ED]" />
            <div className="mt-5 space-y-2">
              <div className="h-4 w-3/4 rounded-sm bg-[#F0F0ED]" />
              <div className="h-4 w-2/3 rounded-sm bg-[#F0F0ED]" />
            </div>
            <div className="mt-6 flex justify-between gap-3 border-t border-[#E8E8E6] pt-4">
              <div className="h-5 w-1/2 rounded-sm bg-[#F0F0ED]" />
              <div className="h-11 w-1/4 rounded-sm bg-[#E5E5E5]" />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}