import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: mocks.create } } }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { createAuditLog } from "./audit-log.service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "192.0.2.1, 192.0.2.2", "user-agent": "audit-test" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("persistencia de auditoría", () => {
  it.each([undefined, false, true])("mantiene la API y persiste los datos con required=%s", async (required) => {
    await expect(createAuditLog({
      action: "SENSITIVE_DATA_VIEWED", required,
      actor: { id: "actor", email: "editor@example.test", name: "Editor" },
      target: { type: "form_winner_data", id: "form" },
      context: { workspaceId: "workspace", workspaceName: "Radio", formId: "form", formTitle: "Concurso", metadata: { scope: "winner_modal", displayedResponses: 1 } },
    })).resolves.toBeUndefined();
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith({ data: {
      action: "SENSITIVE_DATA_VIEWED", actorId: "actor", actorEmail: "editor@example.test", actorName: "Editor",
      targetType: "form_winner_data", targetId: "form", workspaceId: "workspace", workspaceName: "Radio",
      formId: "form", formTitle: "Concurso", metadata: { scope: "winner_modal", displayedResponses: 1 },
      ipAddress: "192.0.2.1", userAgent: "audit-test",
    } });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([undefined, false])("un fallo sigue siendo best-effort con required=%s sin registrar secretos", async (required) => {
    mocks.create.mockRejectedValueOnce(new Error("DB-SECRET correo token motivo"));
    await expect(createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required })).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[AUDIT] Failed to create audit log");
  });

  it("required true propaga solo un error genérico si Prisma rechaza la escritura", async () => {
    const secret = new Error("DB-SECRET correo token motivo");
    mocks.create.mockRejectedValueOnce(secret);
    const error = await createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required: true }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBe(secret);
    expect((error as Error).message).toBe("No se pudo registrar la auditoría requerida.");
    expect(error).not.toHaveProperty("cause");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[AUDIT] Failed to create audit log");
  });

  it("sin contexto HTTP sigue exigiendo persistir el evento", async () => {
    mocks.headers.mockRejectedValueOnce(new Error("Sin request"));
    await createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required: true });
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith({ data: expect.objectContaining({
      ipAddress: null, userAgent: null, actorId: null, targetId: null, metadata: undefined,
    }) });
  });

  it("no resuelve antes de que termine la escritura requerida", async () => {
    let complete!: () => void;
    mocks.create.mockReturnValueOnce(new Promise<void>((resolve) => { complete = resolve; }));
    let settled = false;
    const pending = createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required: true }).then(() => { settled = true; });
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    complete();
    await pending;
    expect(settled).toBe(true);
  });
});