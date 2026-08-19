import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LuArrowUpRight, LuFileText, LuUsers } from "react-icons/lu";
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
          </>
        }
        backHref="/admin/workspaces"
        backLabel="Volver a workspaces"
        actions={
          <>
            <div className="rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#737373]">
              {formCount} en Typeform
            </div>
            <div className="rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#737373]">
              {appForms.length} creados por la app
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-sm text-[#737373]">
              <LuUsers className="size-4 text-[#18181B]" />
              {memberCount} miembros
            </div>
          </>
        }
      />

      {typeformForms.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] py-16 text-center">
          <LuFileText className="mb-3 size-8 text-[#737373]" />
          <p className="text-sm font-medium text-[#737373]">
            No hay formularios en este workspace
          </p>
          <p className="mt-1 text-xs text-[#737373]">
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
                  className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-[#171717]">
                          {form.title}
                        </h2>
                        {appForm && (
                          <span className="rounded-md border border-[#18181B]/30 px-2 py-0.5 text-[11px] font-medium text-[#18181B]">
                            App
                          </span>
                        )}
                      </div>

                      {appForm?.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-[#737373]">
                          {appForm.description}
                        </p>
                      )}

                      <p className="mt-2 truncate text-xs text-[#737373]">
                        ID: {form.id}
                      </p>
                    </div>

                    {form._links?.display && (
                      <a
                        href={form._links.display}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[#E5E5E5] p-2 text-[#737373] transition hover:border-[#18181B] hover:text-[#18181B]"
                      >
                        <LuArrowUpRight className="size-4" />
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#737373]">
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
                    <div className="mt-2 text-xs text-[#737373]">
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
