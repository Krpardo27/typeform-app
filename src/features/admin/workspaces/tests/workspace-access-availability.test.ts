import { beforeEach, describe, expect, it, vi } from "vitest";

type Role = "VIEWER" | "EDITOR";
type Assignment = { userId: string; workspaceId: string; role: Role };
type Workspace = { id: string; name: string; typeformId: string; createdFromApp: boolean };
type WorkspaceWhere = { createdFromApp?: boolean; id?: { in: string[] }; typeformId?: { in: string[] } };
type MembershipWhere = { userId: string; workspace?: WorkspaceWhere; workspaceId?: { in?: string[]; notIn?: string[] } };
type Upsert = { where: { userId_workspaceId: { userId: string; workspaceId: string } }; create: Assignment; update: { role: Role } };
type Operation = { kind: "delete"; where: MembershipWhere } | { kind: "upsert"; args: Upsert };

const mocks = vi.hoisted(() => ({
  actor: vi.fn(), catalog: vi.fn(), user: vi.fn(), workspace: vi.fn(), memberships: vi.fn(),
  deletion: vi.fn(), upsert: vi.fn(), txUpsert: vi.fn(), transaction: vi.fn(),
  allowed: vi.fn(), allowedUpsert: vi.fn(), userUpsert: vi.fn(), audit: vi.fn(), revalidate: vi.fn(),
  assignments: [] as Assignment[],
}));
vi.mock("@/generated/prisma/client", async () => import("@/generated/prisma/enums"));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/features/typeform/services/typeform.service", () => ({ getAllTypeformWorkspaces: mocks.catalog }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.user }, workspace: { findMany: mocks.workspace },
  userWorkspace: { findMany: mocks.memberships, deleteMany: mocks.deletion, upsert: mocks.upsert },
  allowedUser: { findUnique: mocks.allowed }, $transaction: mocks.transaction,
} }));

import { updateUserWorkspaces } from "../actions/update-user-workspaces";
import { authorizeMemberBatch } from "@/features/admin/members/actions/authorize-member.action";

const workspaces: Workspace[] = [
  { id: "live", name: "Radio activa", typeformId: "remote-live", createdFromApp: true },
  { id: "retired", name: "Radio retirada", typeformId: "remote-retired", createdFromApp: true },
  { id: "external", name: "Radio externa", typeformId: "remote-external", createdFromApp: false },
];
const initialAssignments: Assignment[] = [
  { userId: "target", workspaceId: "live", role: "VIEWER" },
  { userId: "target", workspaceId: "retired", role: "EDITOR" },
  { userId: "target", workspaceId: "external", role: "VIEWER" },
  { userId: "another-user", workspaceId: "live", role: "EDITOR" },
];

function workspaceMatches(workspace: Workspace, where: WorkspaceWhere) {
  return (where.createdFromApp === undefined || workspace.createdFromApp === where.createdFromApp)
    && (!where.id || where.id.in.includes(workspace.id))
    && (!where.typeformId || where.typeformId.in.includes(workspace.typeformId));
}
function membershipMatches(assignment: Assignment, where: MembershipWhere) {
  const workspace = workspaces.find((item) => item.id === assignment.workspaceId)!;
  return assignment.userId === where.userId
    && (!where.workspace || workspaceMatches(workspace, where.workspace))
    && (!where.workspaceId?.in || where.workspaceId.in.includes(assignment.workspaceId))
    && (!where.workspaceId?.notIn || !where.workspaceId.notIn.includes(assignment.workspaceId));
}
function upsert(args: Upsert) {
  const id = args.where.userId_workspaceId;
  const current = mocks.assignments.find((assignment) => assignment.userId === id.userId && assignment.workspaceId === id.workspaceId);
  if (current) current.role = args.update.role;
  else mocks.assignments.push({ ...args.create });
  return current ?? args.create;
}
function noWrites() {
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.deletion).not.toHaveBeenCalled();
  expect(mocks.upsert).not.toHaveBeenCalled();
  expect(mocks.txUpsert).not.toHaveBeenCalled();
  expect(mocks.allowedUpsert).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
  expect(mocks.assignments).toEqual(initialAssignments);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.assignments = structuredClone(initialAssignments);
  mocks.actor.mockResolvedValue({ id: "admin", name: "Admin", email: "admin@example.test", globalRole: "SUPER_ADMIN" });
  mocks.catalog.mockResolvedValue([{ id: "remote-live" }, { id: "remote-external" }]);
  mocks.user.mockResolvedValue({ id: "target" });
  mocks.allowed.mockResolvedValue({ id: "allowed" });
  mocks.workspace.mockImplementation(async ({ where }: { where: WorkspaceWhere }) => workspaces.filter((workspace) => workspaceMatches(workspace, where)));
  mocks.memberships.mockImplementation(async ({ where }: { where: MembershipWhere }) => mocks.assignments.filter((assignment) => membershipMatches(assignment, where)));
  // Operaciones diferidas, igual que Prisma: solo se aplican en la transacción.
  mocks.deletion.mockImplementation(({ where }: { where: MembershipWhere }) => ({ kind: "delete", where }));
  mocks.upsert.mockImplementation((args: Upsert) => ({ kind: "upsert", args }));
  mocks.txUpsert.mockImplementation(async (args: Upsert) => upsert(args));
  mocks.allowedUpsert.mockResolvedValue({ id: "allowed" });
  mocks.userUpsert.mockResolvedValue({ id: "target" });
  mocks.transaction.mockImplementation(async (input: Operation[] | ((tx: unknown) => Promise<unknown>)) => {
    if (typeof input === "function") return input({
      allowedUser: { upsert: mocks.allowedUpsert }, user: { upsert: mocks.userUpsert },
      userWorkspace: { findMany: mocks.memberships, upsert: mocks.txUpsert },
    });
    return input.map((operation) => {
      if (operation.kind === "upsert") return upsert(operation.args);
      const before = mocks.assignments.length;
      mocks.assignments = mocks.assignments.filter((assignment) => !membershipMatches(assignment, operation.where));
      return { count: before - mocks.assignments.length };
    });
  });
});

describe("guardado de permisos limitado a workspaces disponibles", () => {
  it("cambiar el rol activo no borra ni altera relaciones históricas, externas o de otros usuarios", async () => {
    expect(await updateUserWorkspaces({ userId: "target", workspaceIds: ["live::EDITOR"] })).toMatchObject({ success: true, changed: true });
    expect(mocks.assignments).toEqual(initialAssignments.map((assignment) => assignment.userId === "target" && assignment.workspaceId === "live"
      ? { ...assignment, role: "EDITOR" } : assignment));
    expect(mocks.deletion.mock.calls[0][0].where.workspace).toEqual({ createdFromApp: true, typeformId: { in: ["remote-live", "remote-external"] } });
  });

  it("vaciar selección revoca solo accesos activos de la aplicación", async () => {
    expect(await updateUserWorkspaces({ userId: "target", workspaceIds: [] })).toMatchObject({ success: true, changed: true });
    expect(mocks.assignments).toEqual(initialAssignments.filter((assignment) => !(assignment.userId === "target" && assignment.workspaceId === "live")));
  });

  it("no hay cambios si el usuario solo conserva asignaciones históricas o externas", async () => {
    mocks.assignments = structuredClone(initialAssignments.filter((assignment) => !(assignment.userId === "target" && assignment.workspaceId === "live")));
    const before = structuredClone(mocks.assignments);
    expect(await updateUserWorkspaces({ userId: "target", workspaceIds: [] })).toMatchObject({ success: true, changed: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.assignments).toEqual(before);
  });

  it("rechaza por completo una actualización que aún contiene un workspace retirado", async () => {
    expect(await updateUserWorkspaces({ userId: "target", workspaceIds: ["live::EDITOR", "retired::VIEWER"] })).toMatchObject({ success: false, changed: false });
    noWrites();
  });

  it("autorizar un miembro tampoco permite reasignar un workspace remoto retirado", async () => {
    expect(await authorizeMemberBatch({ email: "member@example.test", assignments: [
      { workspaceId: "live", role: "EDITOR" }, { workspaceId: "retired", role: "VIEWER" },
    ] })).toMatchObject({ success: false });
    noWrites();
  });

  it("autorizar un rol activo conserva el resto de accesos", async () => {
    expect(await authorizeMemberBatch({ email: "member@example.test", assignments: [{ workspaceId: "live", role: "EDITOR" }] })).toMatchObject({ success: true });
    expect(mocks.assignments).toEqual(initialAssignments.map((assignment) => assignment.userId === "target" && assignment.workspaceId === "live"
      ? { ...assignment, role: "EDITOR" } : assignment));
    expect(mocks.deletion).not.toHaveBeenCalled();
  });

  it("un catálogo vacío válido no revoca las relaciones ahora históricas", async () => {
    mocks.catalog.mockResolvedValueOnce([]);
    expect(await updateUserWorkspaces({ userId: "target", workspaceIds: [] })).toMatchObject({ success: true, changed: false });
    noWrites();
  });

  it.each([
    ["actualizar permisos", () => updateUserWorkspaces({ userId: "target", workspaceIds: [] })],
    ["autorizar miembro", () => authorizeMemberBatch({ email: "member@example.test", assignments: [{ workspaceId: "live", role: "VIEWER" }] })],
  ] as const)("%s: un error remoto no se trata como catálogo vacío ni provoca escrituras", async (_, run) => {
    const error = new Error("Typeform API error 503");
    mocks.catalog.mockRejectedValueOnce(error);
    await expect(run()).rejects.toBe(error);
    noWrites();
  });
});