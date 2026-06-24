import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LuArrowLeft, LuArrowUpRight, LuFileText } from "react-icons/lu";
import Link from "next/link";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceDetailPage({ params }: Props) {
  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      typeformId: true,
      _count: {
        select: { users: true },
      },
    },
  });

  if (!workspace) notFound();

  const [typeformForms, appForms] = await Promise.all([
    getWorkspaceForms(workspace.typeformId),
    prisma.form.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        typeformId: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const appFormsByTypeformId = new Map(
    appForms.map((form) => [form.typeformId, form]),
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <Link
            href="/admin/workspaces"
            className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            <LuArrowLeft className="size-3" />
            Volver a workspaces
          </Link>

          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white">
            {workspace.name}
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            ID Typeform: {workspace.typeformId}
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Vista de auditoria conectada a Typeform. Prisma solo marca los formularios creados por esta app.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            {typeformForms.total_items} en Typeform
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            {appForms.length} creados por la app
          </div>
        </div>
      </div>

      {/* Forms grid */}
      {typeformForms.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <LuFileText className="mb-3 size-8 text-zinc-700" />
          <p className="text-sm font-medium text-zinc-400">
            No hay formularios en este workspace
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Typeform no devolvio formularios para este workspace.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {typeformForms.items.map((form) => {
            const appForm = appFormsByTypeformId.get(form.id);

            return (
              <article
                key={form.id}
                className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-white">
                        {form.title}
                      </h2>
                      {appForm && (
                        <span className="rounded-md border border-[#C8A96E]/40 px-2 py-0.5 text-[11px] font-medium text-[#C8A96E]">
                          App
                        </span>
                      )}
                    </div>

                    {appForm?.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {appForm.description}
                      </p>
                    )}

                    <p className="mt-2 truncate text-xs text-zinc-600">
                      ID: {form.id}
                    </p>
                  </div>

                  {form._links?.display && (
                    <a
                      href={form._links.display}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
                    >
                      <LuArrowUpRight className="size-4" />
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                  <span>
                    Actualizado{" "}
                    {form.last_updated_at
                      ? new Date(form.last_updated_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "sin fecha"}
                  </span>
                  <span>
                    {form.settings?.is_public === false ? "Privado" : "Publico"}
                  </span>
                </div>

                {appForm && (
                  <div className="mt-2 text-xs text-zinc-600">
                    Registrado en app{" "}
                    {new Date(appForm.createdAt).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
