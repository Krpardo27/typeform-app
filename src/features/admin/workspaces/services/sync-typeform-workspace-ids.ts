import { prisma } from "@/lib/prisma";
import type { TypeformWorkspace } from "@/features/typeform/services/typeform.service";

function normalizeWorkspaceKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type AppWorkspace = {
  id: string;
  name: string;
  typeformId: string;
  selfUrl: string | null;
};

export async function syncTypeformWorkspaceIds(
  typeformWorkspaces: TypeformWorkspace[],
) {
  const appWorkspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      typeformId: true,
      selfUrl: true,
    },
  });

  if (appWorkspaces.length === 0 || typeformWorkspaces.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  const typeformById = new Map(typeformWorkspaces.map((item) => [item.id, item]));
  const typeformByNormalizedName = new Map(
    typeformWorkspaces.map((item) => [normalizeWorkspaceKey(item.name ?? ""), item]),
  );

  const inUseTypeformIds = new Set(appWorkspaces.map((workspace) => workspace.typeformId));

  const updates: {
    workspaceId: string;
    currentTypeformId: string;
    nextTypeformId: string;
    nextSelfUrl: string | null;
  }[] = [];

  for (const workspace of appWorkspaces as AppWorkspace[]) {
    if (typeformById.has(workspace.typeformId)) {
      continue;
    }

    const byName = typeformByNormalizedName.get(normalizeWorkspaceKey(workspace.name));
    const byLegacySlug = typeformByNormalizedName.get(
      normalizeWorkspaceKey(workspace.typeformId),
    );

    const match = byName ?? byLegacySlug;

    if (!match || match.id === workspace.typeformId) {
      continue;
    }

    updates.push({
      workspaceId: workspace.id,
      currentTypeformId: workspace.typeformId,
      nextTypeformId: match.id,
      nextSelfUrl: match.self?.href ?? workspace.selfUrl,
    });
  }

  if (updates.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  let updated = 0;
  let skipped = 0;

  for (const update of updates) {
    if (inUseTypeformIds.has(update.nextTypeformId)) {
      skipped += 1;
      continue;
    }

    await prisma.workspace.update({
      where: { id: update.workspaceId },
      data: {
        typeformId: update.nextTypeformId,
        selfUrl: update.nextSelfUrl,
      },
    });

    inUseTypeformIds.delete(update.currentTypeformId);
    inUseTypeformIds.add(update.nextTypeformId);
    updated += 1;
  }

  return { updated, skipped };
}

export async function ensureAppWorkspacesFromTypeform(
  typeformWorkspaces: TypeformWorkspace[],
) {
  if (typeformWorkspaces.length === 0) {
    return { created: 0 };
  }

  const result = await prisma.workspace.createMany({
    data: typeformWorkspaces.map((workspace) => ({
      name: workspace.name?.trim() || `Workspace ${workspace.id}`,
      typeformId: workspace.id,
      accountId: workspace.account_id ?? workspace.id,
      selfUrl: workspace.self?.href ?? null,
    })),
    skipDuplicates: true,
  });

  return { created: result.count };
}