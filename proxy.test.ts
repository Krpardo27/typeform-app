import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.session } } }));

import proxy from "./proxy";

beforeEach(() => vi.resetAllMocks());

describe("proxy", () => {
  it.each(["/admin/dashboard", "/workspaces/me"])("conserva sesión real y headers en %s", async (path) => {
    const request = new NextRequest(`http://localhost:3000${path}`);
    mocks.session.mockResolvedValue({ user: { status: "ACTIVE" } });
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(mocks.session).toHaveBeenCalledExactlyOnceWith({ headers: request.headers, query: { disableCookieCache: true } });
  });

  it.each([null, { user: { status: "REJECTED" } }])("redirige sin autorizar por presencia de cookie: %j", async (session) => {
    mocks.session.mockResolvedValue(session);
    const response = await proxy(new NextRequest("http://localhost:3000/admin/dashboard", { headers: { cookie: "better-auth.session_token=forged" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("preflight no consulta sesión y mantiene seguridad sin reflejar origen arbitrario", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/api/search", { method: "OPTIONS", headers: { origin: "https://untrusted.invalid" } }));
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it("API delega autenticación al handler sin duplicar sesión", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/api/search"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mocks.session).not.toHaveBeenCalled();
  });
});