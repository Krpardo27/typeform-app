import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/features/auth/components/LoginView", () => ({ LoginView: () => null }));

import HomePage from "./page";
import LoginPage from "./auth/login/page";

beforeEach(() => vi.resetAllMocks());

describe("destinos de entrada", () => {
  it.each([
    [null, "/auth/login"],
    [{ globalRole: "USER" }, "/workspaces/me"],
    [{ globalRole: "SUPER_ADMIN" }, "/admin/workspaces"],
  ])("inicio conserva destino autorizado sin salto admin intermedio: %j", async (user, path) => {
    mocks.user.mockResolvedValue(user);
    await expect(HomePage()).rejects.toThrow(`redirect:${path}`);
  });

  it.each([
    [{ globalRole: "USER" }, "/workspaces/me"],
    [{ globalRole: "SUPER_ADMIN" }, "/admin/workspaces"],
  ])("login conserva destino por rol: %j", async (user, path) => {
    mocks.user.mockResolvedValue(user);
    await expect(LoginPage()).rejects.toThrow(`redirect:${path}`);
  });

  it("login anónimo muestra la vista", async () => {
    mocks.user.mockResolvedValue(null);
    expect(await LoginPage()).toBeTruthy();
  });
});