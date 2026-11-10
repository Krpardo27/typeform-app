import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getAvailableAppWorkspaceWhere } from "./workspace-availability";
import { WORKSPACE_PAGE_SIZES } from "../utils/workspace-view";

export const getAdminWorkspacesPage = cache(async (requestedPage: number, requestedPageSize: number) => {
  const itemsPerPage = WORKSPACE_PAGE_SIZES.find((size) => size === requestedPageSize) ?? WORKSPACE_PAGE_SIZES[0];
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = await getAvailableAppWorkspaceWhere();
  if (where.typeformId.in.length === 0) {
    return { items: [], totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage };
  }

  // Contar y leer sobre la misma instantánea local, después de filtrar por Typeform.
  // No se eliminan workspaces ni relaciones: la disponibilidad es una lectura reversible.
  return prisma.$transaction(async (tx) => {
    const totalItems = await tx.workspace.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const currentPage = Math.min(page, totalPages);
    const items = totalItems === 0 ? [] : await tx.workspace.findMany({
      where,
      select: {
        id: true,
        name: true,
        typeformId: true,
        templateFormTypeformId: true,
        _count: { select: { users: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
    });
    return { items, totalItems, totalPages, currentPage, itemsPerPage };
  }, { isolationLevel: "RepeatableRead" });
});

export type AdminWorkspacesPage = Awaited<ReturnType<typeof getAdminWorkspacesPage>>;