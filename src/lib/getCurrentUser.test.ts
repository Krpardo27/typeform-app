import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), headers: new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));

import { getCurrentUser } from "./getCurrentUser";

beforeEach(() => vi.resetAllMocks());

describe("getCurrentUser", () => {
  it("no consulta usuario cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.getSession).toHaveBeenCalledExactlyOnceWith({
      headers: mocks.headers, query: { disableCookieCache: true },
    });
  });

  it.each(["USER", "SUPER_ADMIN"])("proyecta %s desde la lectura viva del proveedor sin otra consulta", async (globalRole) => {
    mocks.getSession.mockResolvedValue({
      session: { token: "private-token" },
      user: { id: "u1", name: "Persona", email: "user@example.invalid", globalRole, status: "ACTIVE", extra: "private" },
    });
    expect(await getCurrentUser()).toEqual({ id: "u1", name: "Persona", email: "user@example.invalid", globalRole });
  });

  it("deniega cuentas rechazadas incluso con sesión y rol administrador", async () => {
    mocks.getSession.mockResolvedValue({ user: { globalRole: "SUPER_ADMIN", status: "REJECTED" } });
    expect(await getCurrentUser()).toBeNull();
  });

  it("no convierte fallos del proveedor en usuario anónimo", async () => {
    mocks.getSession.mockRejectedValue(new Error("database unavailable"));
    await expect(getCurrentUser()).rejects.toThrow("database unavailable");
  });
});