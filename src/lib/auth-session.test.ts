import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";

const mocks = vi.hoisted(() => ({ user: vi.fn(), existingUser: vi.fn(), allowed: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.user, findFirst: mocks.existingUser },
  allowedUser: { findFirst: mocks.allowed },
} }));
vi.mock("@/emails/services/AuthEmailService", () => ({ AuthEmailService: { sendOtpEmail: mocks.send } }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: vi.fn() }));

import { auth } from "./auth";

const secret = "local-test-secret-for-auth-contract-only-123456789";
const email = "user@example.invalid";

function provider(db: MemoryDB) {
  return betterAuth({
    ...auth.options,
    baseURL: "http://localhost:3000",
    secret,
    database: memoryAdapter(db),
    plugins: auth.options.plugins.filter((plugin) => plugin.id !== "next-cookies"),
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ email, status: "ACTIVE" });
  mocks.existingUser.mockResolvedValue(null);
  mocks.allowed.mockResolvedValue({ id: "allowed" });
});

describe("contrato real de Better Auth con adaptador en memoria", () => {
  it("getSession expone campos controlados por servidor y relee rol/estado sin cookie cache", async () => {
    const user = { id: "u1", email, name: "Persona", emailVerified: true, globalRole: "SUPER_ADMIN", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
    const db: MemoryDB = { user: [user], session: [{ id: "s1", token: "local-test-token", userId: "u1", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(), updatedAt: new Date() }] };
    const instance = provider(db);
    const context = await instance.$context;
    const signature = createHmac("sha256", secret).update("local-test-token").digest("base64");
    const headers = new Headers({ cookie: `${context.authCookies.sessionToken.name}=${encodeURIComponent(`local-test-token.${signature}`)}` });
    const read = () => instance.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });

    expect((await read())?.user).toMatchObject({ globalRole: "SUPER_ADMIN", status: "ACTIVE" });
    user.globalRole = "USER";
    user.status = "REJECTED";
    expect((await read())?.user).toMatchObject({ globalRole: "USER", status: "REJECTED" });
    db.session.length = 0;
    expect(await read()).toBeNull();
  });

  async function requestOtp(instance: ReturnType<typeof provider>) {
    await instance.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    return mocks.send.mock.calls[0][0].otp as string;
  }

  it("la API pública no acepta rol/estado privilegiados del cliente", async () => {
    const db: MemoryDB = { user: [], session: [], verification: [], account: [] };
    const instance = provider(db);
    const otp = await requestOtp(instance);
    const response = await instance.handler(new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, otp, globalRole: "SUPER_ADMIN", status: "ACTIVE" }),
    }));
    expect(response.status).toBe(200);
    expect(db.user[0]).toMatchObject({ globalRole: "USER", status: "PENDING" });
    expect(db.session).toHaveLength(1);
  });

  it.each(["REJECTED", "no-whitelist"])("OTP ya emitido no crea sesión por API tras revocación: %s", async (reason) => {
    const db: MemoryDB = { user: [{ id: "u1", email, name: "Persona", emailVerified: true, globalRole: "USER", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }], session: [], verification: [], account: [] };
    const instance = provider(db);
    const otp = await requestOtp(instance);
    if (reason === "REJECTED") mocks.user.mockResolvedValue({ email, status: "REJECTED" });
    else mocks.allowed.mockResolvedValue(null);
    const response = await instance.handler(new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, otp }),
    }));
    expect(response.status).toBe(403);
    expect(db.session).toHaveLength(0);
  });
});