import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  getTypeformWorkspace,
  getWorkspaceForms,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { WORKSPACE_FORMS_PAGE_SIZE, parseWorkspacePage } from "../utils/workspace-view";

export const getAdminWorkspace = cache(async (workspaceId: string) =>
  prisma.workspace.findFirst({
    where: {
      createdFromApp: true,
      OR: [{ id: workspaceId }, { typeformId: workspaceId }],
    },
    select: {
      id: true,
      name: true,
      typeformId: true,
      templateFormTypeformId: true,
      _count: { select: { users: true, forms: true } },
    },
  }),
);

export async function getAdminWorkspaceFormsPage(workspaceTypeformId: string, requestedPage: number) {
  // La primera página (cacheada por el servicio Typeform) permite conocer
  // el límite antes de enviar una página fuera de rango al proveedor.
  const firstPage = await getWorkspaceForms(workspaceTypeformId, {
    page: 1,
    pageSize: WORKSPACE_FORMS_PAGE_SIZE,
  });
  const safeRequestedPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  let currentPage = Math.min(safeRequestedPage, Math.max(1, firstPage.page_count));
  let response = currentPage === 1 ? firstPage : await getWorkspaceForms(workspaceTypeformId, {
    page: currentPage,
    pageSize: WORKSPACE_FORMS_PAGE_SIZE,
  });

  // El total puede cambiar entre consultas si se eliminan formularios.
  const correctedPage = Math.min(currentPage, Math.max(1, response.page_count));
  if (correctedPage !== currentPage) {
    currentPage = correctedPage;
    response = await getWorkspaceForms(workspaceTypeformId, {
      page: currentPage,
      pageSize: WORKSPACE_FORMS_PAGE_SIZE,
    });
  }

  return {
    items: response.items,
    totalItems: response.total_items,
    totalPages: Math.max(1, response.page_count),
    currentPage,
  };
}

export async function getAdminWorkspaceDetail(workspaceId: string, page: unknown) {
  const appWorkspace = await getAdminWorkspace(workspaceId);
  if (!appWorkspace) return null;

  const resolvedId = await resolveWorkspaceTypeformId(appWorkspace.typeformId);
  const typeformWorkspace = await getTypeformWorkspace(resolvedId);
  const formsPage = await getAdminWorkspaceFormsPage(typeformWorkspace.id, parseWorkspacePage(page));
  const formIds = formsPage.items.map((form) => form.id);

  const appForms = formIds.length === 0 ? [] : await prisma.form.findMany({
    where: { workspaceId: appWorkspace.id, typeformId: { in: formIds } },
    select: {
      id: true,
      typeformId: true,
      description: true,
      createdAt: true,
    },
  });

  return { appWorkspace, typeformWorkspace, formsPage, appForms };
}