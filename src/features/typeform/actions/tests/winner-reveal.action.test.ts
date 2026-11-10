import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ guard: vi.fn(), finish: vi.fn(), form: vi.fn(), belongs: vi.fn(), responses: vi.fn(), audit: vi.fn(),
  auditCreate: vi.fn(), realAudit: null as null | typeof import("@/features/admin/audit/services/audit-log.service").createAuditLog,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: mocks.auditCreate } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../../services/winner-reveal.service", () => ({ requireWinnerRevealGrant: mocks.guard, finishWinnerReveal: mocks.finish,
  WinnerRevealDenied: class WinnerRevealDenied extends Error { constructor() { super("Vuelve a consultar los ganadores guardados para acceder a sus datos."); } },
}));
vi.mock("../../services/load-winner-responses", () => ({ getWinnerResponsesByToken: mocks.responses }));
vi.mock("../../services/typeform.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../services/typeform.service")>(), getTypeformForm: mocks.form, formBelongsToWorkspace: mocks.belongs,
}));
vi.mock("@/features/admin/audit/services/audit-log.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/audit/services/audit-log.service")>();
  mocks.realAudit = actual.createAuditLog;
  return { ...actual, createAuditLog: mocks.audit };
});
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { readWinnerDataAction, finishWinnerDataAction } from "../winner-reveal.action";
import { WinnerRevealDenied } from "../../services/winner-reveal.service";

const context = { actor: { user: { id: "user" } },
  form: { workspaceId: "workspace", workspace: { name: "Radio", typeformId: "remote-workspace" } },
  grant: { responseTokens: ["a"] }, expiresAt: new Date("2099-01-01"),
  winners: [{ responseToken: "a", participantEmail: "winner@example.test", reason: "Motivo persistido autorizado" }],
};
const raw = { token: "a", submitted_at: "2026-11-06T12:00:00Z", answers: [{ type: "text", field: { ref: "comentario" }, text: "DATOS-COMPLETOS" }], hidden: { extra: "HIDDEN-PRIVADO" } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.audit.mockImplementation(mocks.realAudit!);
  mocks.guard.mockResolvedValue(context);
  mocks.form.mockResolvedValue({ id: "form", title: "Concurso" });
  mocks.belongs.mockReturnValue(true);
  mocks.responses.mockResolvedValue(new Map([["a", raw]]));
});
afterEach(() => vi.restoreAllMocks());

describe("consulta sensible bajo demanda", () => {
  it("solo devuelve el participante autorizado solicitado y audita la consulta", async () => {
    const result = await readWinnerDataAction("workspace", "form", "flow", "a");
    expect(result).toMatchObject({ status: "revealed", contact: "winner@example.test", response: { token: "a", visibility: "winner" } });
    expect(JSON.stringify(result)).toContain("DATOS-COMPLETOS");
    expect(JSON.stringify(result)).toContain("HIDDEN-PRIVADO");
    expect(mocks.responses).toHaveBeenCalledExactlyOnceWith("form", ["a"]);
    expect(mocks.guard).toHaveBeenCalledTimes(3);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "SENSITIVE_DATA_VIEWED", required: true, actor: context.actor.user,
      context: expect.objectContaining({ metadata: { displayedResponses: 1, revealedTokens: "a", scope: "winner_modal", reason: "Motivo persistido autorizado" } }) }));
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it("no permite pedir otro token aunque pertenezca al mismo formulario", async () => {
    const result = await readWinnerDataAction("workspace", "form", "flow", "b");
    expect(result.status).toBe("denied");
    expect(mocks.form).not.toHaveBeenCalled();
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("un permiso inexistente no provoca ninguna lectura de Typeform", async () => {
    mocks.guard.mockRejectedValueOnce(new WinnerRevealDenied());
    expect(await readWinnerDataAction("workspace", "form", "flow", "a")).toEqual({
      status: "denied", message: "Vuelve a consultar los ganadores guardados para acceder a sus datos.",
    });
    expect(mocks.form).not.toHaveBeenCalled();
  });

  it("no revela un token sin ganador persistido en la revalidación", async () => {
    mocks.guard.mockResolvedValueOnce(context).mockResolvedValueOnce({ ...context, winners: [] });
    expect((await readWinnerDataAction("workspace", "form", "flow", "a")).status).toBe("denied");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("un fallo de auditoría impide entregar datos completos", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("PII-AUDIT"));
    const result = await readWinnerDataAction("workspace", "form", "flow", "a");
    expect(result.status).toBe("denied");
    expect(JSON.stringify(result)).not.toMatch(/DATOS-COMPLETOS|HIDDEN-PRIVADO|PII-AUDIT/);
  });

  it("integración: el servicio real deniega el modal cuando Prisma no persiste la auditoría", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auditCreate.mockRejectedValueOnce(new Error("DB-SECRET winner@example.test flow HIDDEN-PRIVADO"));
    const result = await readWinnerDataAction("workspace", "form", "flow", "a");
    expect(result.status).toBe("denied");
    expect(result).not.toHaveProperty("response");
    expect(result).not.toHaveProperty("contact");
    expect(JSON.stringify(result)).not.toMatch(/DATOS-COMPLETOS|HIDDEN-PRIVADO|DB-SECRET|winner@example|flow/);
    expect(mocks.auditCreate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      data: expect.objectContaining({ action: "SENSITIVE_DATA_VIEWED", actorId: "user" }),
    }));
    expect(log.mock.calls).toEqual([["[AUDIT] Failed to create audit log"]]);
    expect(mocks.guard).toHaveBeenCalledTimes(2);
  });

  it("un formulario movido a otro workspace deniega los datos", async () => {
    mocks.belongs.mockReturnValueOnce(false);
    expect((await readWinnerDataAction("workspace", "form", "flow", "a")).status).toBe("denied");
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it.each(["revocado durante fetch", "revocado durante auditoría"])("no entrega el dato si el flujo queda %s", async (scenario) => {
    const duringAudit = scenario.includes("auditoría");
    mocks.guard.mockReset();
    mocks.guard.mockResolvedValueOnce(context);
    if (duringAudit) mocks.guard.mockResolvedValueOnce(context);
    mocks.guard.mockRejectedValueOnce(new WinnerRevealDenied());
    const result = await readWinnerDataAction("workspace", "form", "flow", "a");
    expect(result.status).toBe("denied");
    expect(JSON.stringify(result)).not.toContain("DATOS-COMPLETOS");
  });

  it("una respuesta de proveedor con token incorrecto no se revela", async () => {
    mocks.responses.mockResolvedValueOnce(new Map([["a", { ...raw, token: "b" }]]));
    expect((await readWinnerDataAction("workspace", "form", "flow", "a")).status).toBe("denied");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("un fallo del proveedor no filtra su mensaje ni datos en el error", async () => {
    mocks.responses.mockRejectedValueOnce(new Error("PII-NO-REGISTRAR"));
    const result = await readWinnerDataAction("workspace", "form", "flow", "a");
    expect(result.status).toBe("denied");
    expect(JSON.stringify(result)).not.toContain("PII-NO-REGISTRAR");
    expect(result).toMatchObject({ message: "No se pudieron consultar los datos. Cierra el detalle y vuelve a consultar los ganadores guardados." });
  });

  it("finalizar delega la revocación sin devolver datos personales", async () => {
    await finishWinnerDataAction("workspace", "form", "flow");
    expect(mocks.finish).toHaveBeenCalledExactlyOnceWith("flow", "workspace", "form");
  });
});