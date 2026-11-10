import { cache } from "react";
import { getAllTypeformWorkspaces } from "@/features/typeform/services/typeform.service";

// Memoización por petición de React, no una caché de disponibilidad entre visitas.
export const getAvailableWorkspaceIds = cache(async () =>
  new Set((await getAllTypeformWorkspaces()).map((workspace) => workspace.id)),
);

export const getAvailableAppWorkspaceWhere = cache(async () => ({
  createdFromApp: true,
  typeformId: { in: [...await getAvailableWorkspaceIds()] },
}));

export async function filterAvailableWorkspaces<T extends { typeformId: string }>(workspaces: T[]): Promise<T[]> {
  if (workspaces.length === 0) return [];
  const availableIds = await getAvailableWorkspaceIds();
  // Comparar IDs exactos: un workspace nuevo con el mismo nombre no es el anterior.
  return workspaces.filter((workspace) => availableIds.has(workspace.typeformId));
}