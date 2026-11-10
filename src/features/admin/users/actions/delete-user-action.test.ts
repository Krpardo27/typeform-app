import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), transaction: vi.fn(), target: vi.fn(), count: vi.fn(),
  sessions: vi.fn(), workspaces: vi.fn(), allowedUser: vi.fn(), userDelete: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { deleteUserAction } from "./delete-user-action";

const tx = {
  user: { findUnique: mocks.target, count: mocks.count, delete: mocks.userDelete },
  session: { deleteMany: mocks.sessions },
  userWorkspace: { deleteMany: mocks.workspaces },
  allowedUser: { deleteMany: mocks.allowedUser },
};

function expectNoDeletes() {
  for (const mock of [mocks.sessions, mocks.workspaces, mocks.allowedUser, mocks.userDelete]) {
    expect(mock).not.toHaveBeenCalled();
  }
  expect(mocks.revalidate).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({ id: "self", globalRole: "SUPER_ADMIN" });
  mocks.target.mockResolvedValue({ id: "target", email: "Persona@Example.test", globalRole: "USER" });
  mocks.count.mockResolvedValue(2);
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
});

describe("deleteUserAction con base de datos simulada", () => {
  it("rechaza solicitudes sin sesión", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await deleteUserAction("target")).toEqual({ error: "No autenticado." });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expectNoDeletes();
  });

  it("rechaza a quien no es superadministrador", async () => {
    mocks.currentUser.mockResolvedValue({ id: "other", globalRole: "USER" });
    expect(await deleteUserAction("target")).toEqual({ error: "No tienes permisos para realizar esta acción." });
    expectNoDeletes();
  });

  it.each(["", "   "])("rechaza el identificador inválido %j", async (id) => {
    expect(await deleteUserAction(id)).toEqual({ error: "ID de usuario inválido." });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expectNoDeletes();
  });

  it.each(["self", " self "])("protege la cuenta propia aunque se envíe directamente el ID %j", async (id) => {
    expect(await deleteUserAction(id)).toEqual({ error: "No puedes eliminar tu propia cuenta." });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expectNoDeletes();
  });

  it("no borra nada si el usuario ya no existe", async () => {
    mocks.target.mockResolvedValue(null);
    expect(await deleteUserAction("target")).toEqual({ error: "Usuario no encontrado." });
    expectNoDeletes();
  });

  it("protege al último superadministrador dentro de una transacción serializable", async () => {
    mocks.target.mockResolvedValue({ id: "target", email: "admin@example.test", globalRole: "SUPER_ADMIN" });
    mocks.count.mockResolvedValue(1);
    expect(await deleteUserAction("target")).toEqual({ error: "No puedes eliminar al único superadministrador." });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expectNoDeletes();
  });

  it("elimina sesiones, asignaciones, autorización y usuario en la misma transacción", async () => {
    expect(await deleteUserAction("target")).toEqual({ success: true });
    expect(mocks.sessions).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(mocks.workspaces).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(mocks.allowedUser).toHaveBeenCalledWith({ where: { email: { equals: "Persona@Example.test", mode: "insensitive" } } });
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "target" } });
    expect(mocks.revalidate.mock.calls.map(([path]) => path)).toEqual(["/admin/users", "/admin/miembros", "/admin/workspaces"]);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("permite borrar otro superadministrador cuando no es el único", async () => {
    mocks.target.mockResolvedValue({ id: "target", email: "admin@example.test", globalRole: "SUPER_ADMIN" });
    expect(await deleteUserAction("target")).toEqual({ success: true });
    expect(mocks.count).toHaveBeenCalledWith({ where: { globalRole: "SUPER_ADMIN" } });
    expect(mocks.userDelete).toHaveBeenCalledOnce();
  });

  it("no devuelve éxito ni revalida si la transacción falla", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.transaction.mockRejectedValue(new Error("Error simulado de transacción"));
      expect(await deleteUserAction("target")).toEqual({ error: "No fue posible eliminar al usuario." });
      expectNoDeletes();
    } finally {
      log.mockRestore();
    }
  });
});