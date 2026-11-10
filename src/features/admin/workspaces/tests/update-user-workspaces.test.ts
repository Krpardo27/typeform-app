import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalRole, WorkspaceRole } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  workspaceFindMany: vi.fn(),
  userWorkspaceFindMany: vi.fn(),
  userWorkspaceDeleteMany: vi.fn(),
  userWorkspaceUpsert: vi.fn(),
  transaction: vi.fn(),
  sessionDeleteMany: vi.fn(),
  revalidatePath: vi.fn(),
  availableWhere: vi.fn(),
}));

vi.mock("@/generated/prisma/client", async () => import("@/generated/prisma/enums"));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    workspace: { findMany: mocks.workspaceFindMany },
    userWorkspace: {
      findMany: mocks.userWorkspaceFindMany,
      deleteMany: mocks.userWorkspaceDeleteMany,
      upsert: mocks.userWorkspaceUpsert,
    },
    session: { deleteMany: mocks.sessionDeleteMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../services/workspace-availability", () => ({ getAvailableAppWorkspaceWhere: mocks.availableWhere }));

import { updateUserWorkspaces } from "../actions/update-user-workspaces";

const actor = { id: "admin-1", globalRole: GlobalRole.SUPER_ADMIN };
const payload = { userId: "user-1", workspaceIds: ["workspace-1::VIEWER", "workspace-2::EDITOR"] };
const availableWhere = { createdFromApp: true, typeformId: { in: ["remote-1", "remote-2", "remote-previous"] } };
const assignments = [
  { workspaceId: "workspace-1", role: WorkspaceRole.VIEWER },
  { workspaceId: "workspace-2", role: WorkspaceRole.EDITOR },
];
const invalidInputs: { name: string; input: unknown }[] = [
  { name: "null", input: null },
  { name: "undefined", input: undefined },
  { name: "array", input: [] },
  { name: "objeto vacío", input: {} },
  { name: "userId ausente", input: { workspaceIds: [] } },
  { name: "userId null", input: { ...payload, userId: null } },
  { name: "userId no string", input: { ...payload, userId: 123 } },
  { name: "userId vacío", input: { ...payload, userId: "" } },
  { name: "userId vacío tras trim", input: { ...payload, userId: " \t " } },
  { name: "workspaceIds ausente", input: { userId: payload.userId } },
  { name: "workspaceIds null", input: { ...payload, workspaceIds: null } },
  { name: "workspaceIds string", input: { ...payload, workspaceIds: "workspace-1::VIEWER" } },
  { name: "workspaceIds objeto", input: { ...payload, workspaceIds: {} } },
  ...[
    null, undefined, 123, {}, [], "", "workspace-1", "workspace-1:VIEWER",
    "::VIEWER", " \t ::EDITOR", "workspace-1::", "workspace-1::OWNER",
    "workspace-1::viewer", "workspace-1:: EDITOR", "workspace-1::EDITOR ",
    "workspace-1::VIEWER::EDITOR", "workspace-1::VIEWER::",
  ].map((entry) => ({
    name: `asignación inválida ${JSON.stringify(entry)}`,
    input: { ...payload, workspaceIds: [payload.workspaceIds[0], entry] },
  })),
  { name: "ids duplicados", input: { ...payload, workspaceIds: ["workspace-1::VIEWER", "workspace-1::VIEWER"] } },
  { name: "ids duplicados con distinto rol", input: { ...payload, workspaceIds: ["workspace-1::VIEWER", "workspace-1::EDITOR"] } },
  { name: "ids duplicados tras trim", input: { ...payload, workspaceIds: ["workspace-1::VIEWER", " workspace-1 \t::EDITOR"] } },
];

function expectNoWrites() {
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.userWorkspaceDeleteMany).not.toHaveBeenCalled();
  expect(mocks.userWorkspaceUpsert).not.toHaveBeenCalled();
  expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

function expectNoDatabase() {
  expect(mocks.availableWhere).not.toHaveBeenCalled();
  expect(mocks.userFindUnique).not.toHaveBeenCalled();
  expect(mocks.workspaceFindMany).not.toHaveBeenCalled();
  expect(mocks.userWorkspaceFindMany).not.toHaveBeenCalled();
  expectNoWrites();
}

function expectRefreshPaths() {
  expect(mocks.revalidatePath.mock.calls).toEqual([
    ["/admin/users"], ["/admin/users/user-1"], ["/admin/workspaces"], ["/workspaces/me"],
  ]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue(actor);
  mocks.availableWhere.mockResolvedValue(availableWhere);
  mocks.userFindUnique.mockResolvedValue({ id: payload.userId });
  mocks.workspaceFindMany.mockResolvedValue(assignments.map(({ workspaceId }) => ({ id: workspaceId })));
  mocks.userWorkspaceFindMany.mockResolvedValue([]);
  // Prisma entrega operaciones diferidas a la transacción, no promesas ya ejecutadas.
  mocks.userWorkspaceDeleteMany.mockReturnValue({ operation: "deleteMany" });
  mocks.userWorkspaceUpsert.mockImplementation((args: unknown) => ({ operation: "upsert", args }));
  mocks.transaction.mockResolvedValue([]);
});

describe("updateUserWorkspaces", () => {
  it("rechaza una sesión ausente antes de validar el payload", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect(await updateUserWorkspaces(null)).toEqual({ success: false, changed: false, message: "No autorizado" });
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
    expectNoDatabase();
  });

  it.each([GlobalRole.USER, "ADMIN", "SUPER_ADMIN ", undefined])(
    "rechaza el rol global %s antes de validar el payload", async (globalRole) => {
      mocks.getCurrentUser.mockResolvedValue({ ...actor, globalRole });

      expect(await updateUserWorkspaces(null)).toEqual({
        success: false, changed: false, message: "Solo un SUPER_ADMIN puede actualizar permisos",
      });
      expectNoDatabase();
    },
  );

  it.each(invalidInputs)("rechaza $name sin consultar la BD", async ({ input }) => {
    expect(await updateUserWorkspaces(input)).toEqual({ success: false, changed: false, message: expect.any(String) });
    expectNoDatabase();
  });

  it("rechaza un usuario inexistente sin consultar asignaciones ni escribir", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    expect(await updateUserWorkspaces(payload)).toEqual({ success: false, changed: false, message: "Usuario no encontrado" });
    expect(mocks.userWorkspaceFindMany).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([
    { name: "un ID inexistente", found: [{ id: "workspace-1" }] },
    { name: "un ID externo a la app", found: [{ id: "workspace-2" }] },
    { name: "todos los IDs no asignables", found: [] },
    { name: "un conjunto diferente del solicitado", found: [{ id: "workspace-1" }, { id: "workspace-otro" }] },
  ])("rechaza $name sin filtrar silenciosamente ni revocar accesos", async ({ found }) => {
    // La consulta devuelve únicamente workspaces que cumplen createdFromApp: true.
    mocks.workspaceFindMany.mockResolvedValue(found);

    expect(await updateUserWorkspaces(payload)).toEqual({
      success: false, changed: false, message: "Uno o mas workspaces no existen o no se pueden asignar",
    });
    expect(mocks.workspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { ...availableWhere, id: { in: ["workspace-1", "workspace-2"] } },
      select: { id: true },
    });
    expect(mocks.userWorkspaceFindMany).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("permite [] explícito para revocar solo accesos de la app sin tocar externos ni sesiones", async () => {
    mocks.workspaceFindMany.mockResolvedValue([]);
    mocks.userWorkspaceFindMany.mockResolvedValue(assignments);

    expect(await updateUserWorkspaces({ userId: payload.userId, workspaceIds: [] })).toEqual({
      success: true, changed: true, message: "Permisos actualizados correctamente",
    });
    expect(mocks.workspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { ...availableWhere, id: { in: [] } }, select: { id: true },
    });
    expect(mocks.userWorkspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: payload.userId, workspace: availableWhere },
      select: { workspaceId: true, role: true },
    });
    expect(mocks.userWorkspaceDeleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: payload.userId, workspace: availableWhere, workspaceId: { notIn: [] } },
    });
    expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith([{ operation: "deleteMany" }]);
    expect(mocks.userWorkspaceUpsert).not.toHaveBeenCalled();
    expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
    expectRefreshPaths();
  });

  it.each([false, true])("no escribe ni revalida si no hay cambios (vacío=%s)", async (empty) => {
    mocks.userWorkspaceFindMany.mockResolvedValue(empty ? [] : [...assignments].reverse());
    if (empty) mocks.workspaceFindMany.mockResolvedValue([]);

    expect(await updateUserWorkspaces({ ...payload, workspaceIds: empty ? [] : payload.workspaceIds })).toEqual({
      success: true, changed: false, message: "No se detectaron cambios",
    });
    expectNoWrites();
  });

  it("normaliza IDs y actualiza ambos roles en una única transacción sin mutar el payload", async () => {
    const input = Object.freeze({
      userId: " user-1 \t",
      workspaceIds: Object.freeze([" workspace-1 \t::VIEWER", " workspace-2 ::EDITOR"]),
    });
    const original = structuredClone(input);
    mocks.userWorkspaceFindMany.mockResolvedValue([
      { workspaceId: "workspace-1", role: WorkspaceRole.EDITOR },
      { workspaceId: "workspace-anterior", role: WorkspaceRole.VIEWER },
    ]);

    expect(await updateUserWorkspaces(input)).toEqual({
      success: true, changed: true, message: "Permisos actualizados correctamente",
    });
    expect(input).toEqual(original);
    expect(mocks.userFindUnique).toHaveBeenCalledExactlyOnceWith({ where: { id: "user-1" }, select: { id: true } });
    expect(mocks.workspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { ...availableWhere, id: { in: ["workspace-1", "workspace-2"] } }, select: { id: true },
    });
    expect(mocks.userWorkspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: "user-1", workspace: availableWhere }, select: { workspaceId: true, role: true },
    });
    expect(mocks.userWorkspaceDeleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: "user-1", workspace: availableWhere, workspaceId: { notIn: ["workspace-1", "workspace-2"] } },
    });
    const upserts = assignments.map(({ workspaceId, role }) => ({
      where: { userId_workspaceId: { userId: "user-1", workspaceId } },
      create: { userId: "user-1", workspaceId, role }, update: { role },
    }));
    expect(mocks.userWorkspaceUpsert.mock.calls).toEqual(upserts.map((args) => [args]));
    expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith([
      { operation: "deleteMany" }, ...upserts.map((args) => ({ operation: "upsert", args })),
    ]);
    expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
    expectRefreshPaths();
  });

  it.each(["userFindUnique", "workspaceFindMany", "userWorkspaceFindMany", "transaction"] as const)(
    "propaga el rechazo de BD en %s sin revalidar", async (stage) => {
      const error = new Error(`BD no disponible: ${stage}`);
      mocks[stage].mockRejectedValueOnce(error);

      await expect(updateUserWorkspaces(payload)).rejects.toBe(error);
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
      expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
      if (stage !== "transaction") expectNoWrites();
    },
  );
});