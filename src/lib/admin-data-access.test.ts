import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), query: vi.fn(), remote: vi.fn() }));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not-found"); },
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  auditLog: { findMany: mocks.query }, session: { findMany: mocks.query },
  user: { groupBy: mocks.query, count: mocks.query },
  workspace: { count: mocks.query, findFirst: mocks.query }, form: { count: mocks.query },
  $transaction: mocks.query,
} }));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  getAllTypeformWorkspaces: mocks.remote, getWorkspaceForms: mocks.remote,
  getTypeformWorkspace: mocks.remote, resolveWorkspaceTypeformId: mocks.remote,
}));

import { getDashboardSummary } from "@/features/admin/dashboard/services/dashboard.service";
import { getAdminWorkspacesPage } from "@/features/admin/workspaces/services/admin-workspaces-list.service";
import { getAdminWorkspace, getAdminWorkspaceDetail, getAdminWorkspaceFormsPage } from "@/features/admin/workspaces/services/admin-workspace-detail.service";
import AdminAuditPage from "../../app/admin/auditoria/page";

beforeEach(() => vi.resetAllMocks());

describe("fronteras de lectura administrativa sin depender del layout", () => {
  const reads = [
    ["dashboard", () => getDashboardSummary()],
    ["listado", () => getAdminWorkspacesPage(1, 12)],
    ["metadata", () => getAdminWorkspace("workspace")],
    ["detalle", () => getAdminWorkspaceDetail("workspace", 1)],
    ["formularios", () => getAdminWorkspaceFormsPage("workspace", 1)],
    ["auditoría", () => AdminAuditPage({ searchParams: Promise.resolve({}) })],
  ] as const;

  it.each(reads)("%s rechaza anónimos antes de Prisma/Typeform", async (_label, read) => {
    mocks.user.mockResolvedValue(null);
    await expect(read()).rejects.toThrow("redirect:/auth/login");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.remote).not.toHaveBeenCalled();
  });

  it.each(reads)("%s rechaza usuarios normales antes de Prisma/Typeform", async (_label, read) => {
    mocks.user.mockResolvedValue({ id: "user", globalRole: "USER" });
    await expect(read()).rejects.toThrow("not-found");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.remote).not.toHaveBeenCalled();
  });
});