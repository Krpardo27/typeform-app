import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditAction, GlobalRole, UserStatus, WorkspaceRole } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  workspaceFindMany: vi.fn(),
  allowedUserFindUnique: vi.fn(),
  transaction: vi.fn(),
  allowedUserUpsert: vi.fn(),
  userUpsert: vi.fn(),
  userWorkspaceFindMany: vi.fn(),
  userWorkspaceUpsert: vi.fn(),
  userWorkspaceDelete: vi.fn(),
  userWorkspaceDeleteMany: vi.fn(),
  createAuditLog: vi.fn(),
  revalidatePath: vi.fn(),
  availableWhere: vi.fn(),
}));

vi.mock("@/generated/prisma/client", async () => import("@/generated/prisma/enums"));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findMany: mocks.workspaceFindMany },
    allowedUser: { findUnique: mocks.allowedUserFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({
  createAuditLog: mocks.createAuditLog,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/features/admin/workspaces/services/workspace-availability", () => ({ getAvailableAppWorkspaceWhere: mocks.availableWhere }));

import { authorizeMember, authorizeMemberBatch } from "../actions/authorize-member.action";
import { authorizeMemberSchema } from "../schemas/authorize-member.schema";

const actor = {
  id: "admin-1", email: "admin@example.com", name: "Administradora", globalRole: GlobalRole.SUPER_ADMIN,
};
const assignments = [
  { workspaceId: "workspace-1", role: WorkspaceRole.EDITOR },
  { workspaceId: "workspace-2", role: WorkspaceRole.VIEWER },
  { workspaceId: "workspace-3", role: WorkspaceRole.EDITOR },
];
const payload = { email: "member@example.com", assignments };
const availableWhere = { createdFromApp: true, typeformId: { in: ["remote-1", "remote-2", "remote-3"] } };
const workspaces = assignments.map(({ workspaceId }, index) => ({ id: workspaceId, name: `Radio ${index + 1}` }));
const tx = {
  allowedUser: { upsert: mocks.allowedUserUpsert },
  user: { upsert: mocks.userUpsert },
  userWorkspace: {
    findMany: mocks.userWorkspaceFindMany,
    upsert: mocks.userWorkspaceUpsert,
    delete: mocks.userWorkspaceDelete,
    deleteMany: mocks.userWorkspaceDeleteMany,
  },
};
const invalidInputs: { name: string; input: unknown }[] = [
  { name: "null", input: null },
  { name: "undefined", input: undefined },
  { name: "array", input: [] },
  { name: "objeto vacío", input: {} },
  { name: "correo ausente", input: { assignments } },
  { name: "correo objeto", input: { ...payload, email: {} } },
  { name: "correo inválido", input: { ...payload, email: "no-es-email" } },
  { name: "correo vacío", input: { ...payload, email: "  " } },
  { name: "assignments ausente", input: { email: payload.email } },
  { name: "assignments null", input: { ...payload, assignments: null } },
  { name: "assignments objeto", input: { ...payload, assignments: {} } },
  { name: "selección vacía", input: { ...payload, assignments: [] } },
  { name: "asignación null", input: { ...payload, assignments: [null] } },
  { name: "asignación vacía", input: { ...payload, assignments: [{}] } },
  { name: "id objeto", input: { ...payload, assignments: [{ workspaceId: {}, role: "VIEWER" }] } },
  { name: "id vacío tras trim", input: { ...payload, assignments: [{ workspaceId: " \t ", role: "VIEWER" }] } },
  { name: "rol ausente", input: { ...payload, assignments: [{ workspaceId: "workspace-1" }] } },
  { name: "rol OWNER", input: { ...payload, assignments: [{ workspaceId: "workspace-1", role: "OWNER" }] } },
  { name: "rol objeto", input: { ...payload, assignments: [{ workspaceId: "workspace-1", role: {} }] } },
  { name: "rol minúsculo", input: { ...payload, assignments: [{ workspaceId: "workspace-1", role: "viewer" }] } },
  { name: "ids duplicados", input: { ...payload, assignments: [assignments[0], assignments[0]] } },
  { name: "ids duplicados tras trim", input: { ...payload, assignments: [assignments[0], { workspaceId: " workspace-1 ", role: "VIEWER" }] } },
];

function expectNoEffects() {
  expect(mocks.createAuditLog).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

function expectNoDatabase() {
  expect(mocks.availableWhere).not.toHaveBeenCalled();
  for (const mock of [
    mocks.workspaceFindMany, mocks.allowedUserFindUnique, mocks.transaction,
    mocks.allowedUserUpsert, mocks.userUpsert, mocks.userWorkspaceFindMany,
    mocks.userWorkspaceUpsert, mocks.userWorkspaceDelete, mocks.userWorkspaceDeleteMany,
  ]) expect(mock).not.toHaveBeenCalled();
  expectNoEffects();
}

function expectRefreshPaths() {
  expect(mocks.revalidatePath.mock.calls).toEqual([
    ["/admin/miembros"], ["/admin/users"], ["/admin/workspaces"], ["/workspaces/me"],
  ]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue(actor);
  mocks.availableWhere.mockResolvedValue(availableWhere);
  mocks.workspaceFindMany.mockResolvedValue(workspaces);
  mocks.allowedUserFindUnique.mockResolvedValue(null);
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.allowedUserUpsert.mockResolvedValue({ id: "allowed-1" });
  mocks.userUpsert.mockResolvedValue({ id: "member-1" });
  mocks.userWorkspaceFindMany.mockResolvedValue([]);
  mocks.userWorkspaceUpsert.mockResolvedValue({});
  mocks.createAuditLog.mockResolvedValue(undefined);
});

describe("authorizeMemberSchema", () => {
  it("normaliza correo e ids sin mutar el payload ni sus asignaciones", () => {
    const input = Object.freeze({
      email: "  MEMBER@Example.COM \t",
      assignments: Object.freeze([
        Object.freeze({ workspaceId: " workspace-1 \t", role: WorkspaceRole.EDITOR }),
        Object.freeze({ workspaceId: " workspace-2 ", role: WorkspaceRole.VIEWER }),
      ]),
    });
    const original = structuredClone(input);

    const parsed = authorizeMemberSchema.parse(input);

    expect(parsed).toEqual({ email: payload.email, assignments: assignments.slice(0, 2) });
    expect(input).toEqual(original);
    expect(parsed).not.toBe(input);
    expect(parsed.assignments).not.toBe(input.assignments);
    parsed.assignments.forEach((assignment, index) => expect(assignment).not.toBe(input.assignments[index]));
  });

  it.each(invalidInputs)("rechaza $name", ({ input }) => {
    expect(authorizeMemberSchema.safeParse(input).success).toBe(false);
  });

  it("señala los duplicados en assignments aunque tengan roles distintos", () => {
    const parsed = authorizeMemberSchema.safeParse(invalidInputs.at(-1)!.input);
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Se esperaba un error de validación");
    expect(parsed.error.issues).toContainEqual(expect.objectContaining({ code: "custom", path: ["assignments"] }));
  });
});

describe("authorizeMemberBatch", () => {
  it("rechaza una sesión ausente sin consultar la BD", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(await authorizeMemberBatch(payload)).toEqual({ success: false, message: "No autorizado" });
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
    expectNoDatabase();
  });

  it("rechaza un usuario que no es SUPER_ADMIN sin consultar la BD", async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...actor, globalRole: GlobalRole.USER });
    expect(await authorizeMemberBatch(payload)).toEqual({
      success: false, message: "Solo un SUPER_ADMIN puede autorizar miembros",
    });
    expectNoDatabase();
  });

  it.each(invalidInputs)("rechaza $name antes de consultar la BD", async ({ input }) => {
    expect(await authorizeMemberBatch(input)).toEqual({ success: false, message: expect.any(String) });
    expectNoDatabase();
  });

  it.each([
    { name: "ningún workspace asignable", found: [] },
    { name: "un workspace no creado desde la app o inexistente", found: workspaces.slice(0, 2) },
  ])("rechaza $name sin escrituras ni auditoría", async ({ found }) => {
    // La BD simulada devuelve únicamente las filas que cumplen createdFromApp: true.
    mocks.workspaceFindMany.mockResolvedValue(found);

    expect(await authorizeMemberBatch(payload)).toEqual({
      success: false, message: "Uno o mas workspaces no existen o no se pueden asignar",
    });
    expect(mocks.workspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { ...availableWhere, id: { in: assignments.map(({ workspaceId }) => workspaceId) } },
      select: { id: true, name: true },
    });
    expect(mocks.allowedUserFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userWorkspaceUpsert).not.toHaveBeenCalled();
    expectNoEffects();
  });

  it("autoriza todos los ids con el rol del payload sin borrar accesos a otros workspaces", async () => {
    const input = {
      email: " MEMBER@EXAMPLE.COM ",
      assignments: assignments.map((assignment) => ({ ...assignment, workspaceId: ` ${assignment.workspaceId} ` })),
    };
    const original = structuredClone(input);

    expect(await authorizeMemberBatch(input)).toEqual({ success: true, message: "Miembro autorizado en 3 workspace(s)" });

    expect(input).toEqual(original);
    expect(mocks.workspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { ...availableWhere, id: { in: ["workspace-1", "workspace-2", "workspace-3"] } },
      select: { id: true, name: true },
    });
    expect(mocks.allowedUserFindUnique).toHaveBeenCalledExactlyOnceWith({ where: { email: payload.email }, select: { id: true } });
    expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
    expect(mocks.allowedUserUpsert).toHaveBeenCalledExactlyOnceWith({
      where: { email: payload.email }, update: {}, create: { email: payload.email },
    });
    expect(mocks.userUpsert).toHaveBeenCalledExactlyOnceWith({
      where: { email: payload.email },
      update: { status: UserStatus.ACTIVE },
      create: { id: expect.any(String), email: payload.email, name: "member", status: UserStatus.ACTIVE },
    });
    expect(mocks.userWorkspaceFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: "member-1", workspaceId: { in: ["workspace-1", "workspace-2", "workspace-3"] } },
      select: { workspaceId: true, role: true },
    });
    expect(mocks.userWorkspaceUpsert.mock.calls).toEqual(assignments.map(({ workspaceId, role }) => [{
      where: { userId_workspaceId: { userId: "member-1", workspaceId } },
      update: { role }, create: { userId: "member-1", workspaceId, role },
    }]));
    expect(mocks.userWorkspaceDelete).not.toHaveBeenCalled();
    expect(mocks.userWorkspaceDeleteMany).not.toHaveBeenCalled();
    expect(mocks.createAuditLog.mock.calls).toEqual(assignments.map(({ workspaceId, role }, index) => [{
      action: AuditAction.FORM_CLONED,
      actor: { id: actor.id, email: actor.email, name: actor.name },
      target: { type: "member_access", id: payload.email },
      context: {
        workspaceId, workspaceName: workspaces[index].name,
        metadata: { eventType: "MEMBER_AUTHORIZED", assignedRole: role, wasWhitelisted: false, hadPreviousRole: null },
      },
    }]));
    expectRefreshPaths();
  });

  it("distingue accesos nuevos, roles modificados y roles conservados de un miembro existente", async () => {
    mocks.allowedUserFindUnique.mockResolvedValue({ id: "allowed-1" });
    mocks.userWorkspaceFindMany.mockResolvedValue([
      { workspaceId: "workspace-1", role: WorkspaceRole.VIEWER },
      { workspaceId: "workspace-2", role: WorkspaceRole.VIEWER },
    ]);

    expect(await authorizeMemberBatch(payload)).toEqual({
      success: true, message: "Accesos actualizados: 1 nuevo(s), 1 rol(es) modificado(s)",
    });
    expect(mocks.userWorkspaceUpsert).toHaveBeenCalledTimes(3);
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(3);
    for (const [index, previousRole] of [WorkspaceRole.VIEWER, WorkspaceRole.VIEWER, null].entries()) {
      expect(mocks.createAuditLog).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        context: expect.objectContaining({
          workspaceId: assignments[index].workspaceId,
          metadata: {
            eventType: "MEMBER_AUTHORIZED", assignedRole: assignments[index].role,
            wasWhitelisted: true, hadPreviousRole: previousRole,
          },
        }),
      }));
    }
    expectRefreshPaths();
  });

  it("informa cuando el miembro ya tenía todos los roles y refresca las rutas", async () => {
    mocks.allowedUserFindUnique.mockResolvedValue({ id: "allowed-1" });
    mocks.userWorkspaceFindMany.mockResolvedValue(assignments);

    expect(await authorizeMemberBatch(payload)).toEqual({ success: true, message: "El miembro ya tenia esos accesos configurados" });
    expectRefreshPaths();
  });

  it.each([
    "workspaceFindMany", "allowedUserFindUnique", "transaction", "allowedUserUpsert",
    "userUpsert", "userWorkspaceFindMany", "userWorkspaceUpsert",
  ] as const)("propaga el rechazo de BD en %s sin auditar ni refrescar", async (stage) => {
    const error = new Error(`BD no disponible: ${stage}`);
    mocks[stage].mockRejectedValueOnce(error);

    await expect(authorizeMemberBatch(payload)).rejects.toBe(error);
    expectNoEffects();
    if (stage === "workspaceFindMany" || stage === "allowedUserFindUnique") {
      expect(mocks.transaction).not.toHaveBeenCalled();
    }
  });

  it("propaga el error de auditoría sin invalidar la caché", async () => {
    const error = new Error("Auditoría no disponible");
    mocks.createAuditLog.mockRejectedValueOnce(error);

    await expect(authorizeMemberBatch(payload)).rejects.toBe(error);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("authorizeMember", () => {
  it("adapta la autorización individual conservando el rol solicitado", async () => {
    mocks.workspaceFindMany.mockResolvedValue([workspaces[0]]);

    expect(await authorizeMember({ email: " MEMBER@EXAMPLE.COM ", workspaceId: " workspace-1 ", role: WorkspaceRole.EDITOR }))
      .toEqual({ success: true, message: "Miembro autorizado en 1 workspace(s)" });
    expect(mocks.userWorkspaceUpsert).toHaveBeenCalledExactlyOnceWith({
      where: { userId_workspaceId: { userId: "member-1", workspaceId: "workspace-1" } },
      update: { role: WorkspaceRole.EDITOR },
      create: { userId: "member-1", workspaceId: "workspace-1", role: WorkspaceRole.EDITOR },
    });
    expectRefreshPaths();
  });
});