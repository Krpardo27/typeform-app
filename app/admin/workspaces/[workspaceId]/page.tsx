import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuFileText,
  LuUsers,
} from "react-icons/lu";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  getTypeformWorkspace,
  getWorkspaceForms,
} from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";

const ITEMS_PER_PAGE = 10;

interface Props {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: Props) {
  const { workspaceId } = await params;
  const { page } = await searchParams;

  const typeformWorkspace = await getTypeformWorkspace(workspaceId).catch(
    (error: unknown) => {
      if (
        error instanceof Error &&
        error.message.includes("Typeform API error 404")
      ) {
        notFound();
      }

      throw error;
    },
  );

  const [typeformForms, appWorkspace] = await Promise.all([
    getWorkspaceForms(typeformWorkspace.id),
    prisma.workspace.findUnique({
      where: { typeformId: typeformWorkspace.id },
      select: {
        id: true,
        name: true,
        typeformId: true,
        forms: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            typeformId: true,
            description: true,
            createdAt: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    }),
  ]);

  const appForms = appWorkspace?.forms ?? [];

  const appFormsByTypeformId = new Map(
    appForms.map((form) => [form.typeformId, form]),
  );

  const memberCount = typeformWorkspace.members?.length ?? 0;
  const formCount = typeformWorkspace.forms?.count ?? typeformForms.total_items;
  const totalItems = typeformForms.items.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const requestedPage = Number(page ?? "1");
  const currentPage = Math.min(
    Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1),
    Math.max(totalPages, 1),
  );
  const paginatedForms = typeformForms.items.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="Workspace Typeform"
        title={typeformWorkspace.name ?? appWorkspace?.name ?? "Sin nombre"}
        description={
          <>
            <span className="block">ID Typeform: {typeformWorkspace.id}</span>
            <span className="mt-2 block">
              Vista conectada directamente a Typeform. Prisma solo marca los
              formularios creados por esta app.
            </span>
          </>
        }
        leading={
          <Link
            href="/admin/workspaces"
            className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            <LuArrowLeft className="size-3" />
            Volver a workspaces
          </Link>
        }
        actions={
          <>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            {formCount} en Typeform
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            {appForms.length} creados por la app
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            <LuUsers className="size-4 text-[#C8A96E]" />
            {memberCount} miembros
          </div>
          </>
        }
      />

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
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedForms.map((form) => {
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
                        ? new Date(form.last_updated_at).toLocaleDateString(
                            "es-CL",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "sin fecha"}
                    </span>
                    <span>
                      {form.settings?.is_public === false
                        ? "Privado"
                        : "Público"}
                    </span>
                  </div>

                  {appForm && (
                    <div className="mt-2 text-xs text-zinc-600">
                      Registrado en app{" "}
                      {new Date(appForm.createdAt).toLocaleDateString(
                        "es-CL",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              itemLabel="formularios"
            />
          </div>
        </>
      )}
    </div>
  );
}
