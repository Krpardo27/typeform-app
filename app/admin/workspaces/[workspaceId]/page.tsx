import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LuFileText } from "react-icons/lu";
import { WorkspacePageHeader } from "@/features/admin/workspaces/components/WorkspacePageHeader";
import { AdminWorkspaceFormCard } from "@/features/admin/workspaces/components/AdminWorkspaceFormCard";
import { getAdminWorkspace, getAdminWorkspaceDetail } from "@/features/admin/workspaces/services/admin-workspace-detail.service";
import { WORKSPACE_FORMS_PAGE_SIZE } from "@/features/admin/workspaces/utils/workspace-view";
import { isTypeformNotFoundError } from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";
import { templateFormOptions } from "../../../../config/radio-workspaces";

interface Props {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params;

  const workspace = await getAdminWorkspace(workspaceId);

  return {
    title: workspace?.name ?? "Workspace",
  };
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: Props) {
  const { workspaceId } = await params;
  const { page } = await searchParams;

  const detail = await getAdminWorkspaceDetail(workspaceId, page).catch((error: unknown) => {
    if (isTypeformNotFoundError(error)) notFound();
    throw error;
  });
  if (!detail) notFound();

  const { appWorkspace, typeformWorkspace, formsPage, appForms } = detail;
  const appFormsByTypeformId = new Map(appForms.map((form) => [form.typeformId, form]));
  const templateId = appWorkspace.templateFormTypeformId?.trim() || null;
  const template = templateFormOptions.find((option) => option.value === templateId);

  return (
    <div className="space-y-7">
      <WorkspacePageHeader
        radio={appWorkspace}
        title={typeformWorkspace.name?.trim() || appWorkspace.name || "Workspace sin nombre"}
        description={
          <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm leading-5">
            <div>
              <dt>ID Typeform</dt>
              <dd className="mt-1 font-medium text-[#171717] tabular-nums wrap-anywhere">{typeformWorkspace.id}</dd>
            </div>
            <div className="border-l-2 border-[#FF5C35]/40 pl-3">
              <dt>Plantilla de origen</dt>
              <dd className="mt-1 font-medium text-[#171717] wrap-anywhere">
                {templateId ? `${template?.label ?? "Formulario de Typeform"} · ${templateId}` : "Sin plantilla registrada"}
              </dd>
            </div>
          </dl>
        }
        backHref="/admin/workspaces"
      />

      <section aria-labelledby="workspace-forms-title" className="space-y-4">
        {formsPage.items.length === 0 ? (
          <div className="rounded-md border border-[#FF5C35]/30 bg-white px-5 py-8">
            <LuFileText aria-hidden="true" className="mb-3 size-5 text-[#A53318]" />
            <p className="text-base font-medium text-[#171717]">
              {formsPage.totalItems === 0 ? "Todavía no hay formularios" : "No se recibieron formularios en esta página"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#595954]">
              {formsPage.totalItems === 0
                ? "Los formularios de este workspace aparecerán aquí cuando estén disponibles en Typeform."
                : "El listado puede haber cambiado. Prueba otra página o vuelve a cargar la vista."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {formsPage.items.map((form) => (
              <AdminWorkspaceFormCard
                key={form.id}
                form={form}
                workspaceTypeformId={typeformWorkspace.id}
                templateFormTypeformId={templateId}
                appForm={appFormsByTypeformId.get(form.id)}
              />
            ))}
          </div>
        )}
        <Pagination
          currentPage={formsPage.currentPage}
          totalPages={formsPage.totalPages}
          totalItems={formsPage.totalItems}
          itemsPerPage={WORKSPACE_FORMS_PAGE_SIZE}
          itemLabel="formularios"
        />
      </section>
    </div>
  );
}
