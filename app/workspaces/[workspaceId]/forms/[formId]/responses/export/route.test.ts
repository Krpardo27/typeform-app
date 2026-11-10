import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  allowedUser: vi.fn(),
  workspace: vi.fn(),
  localForm: vi.fn(),
  winners: vi.fn(),
  form: vi.fn(),
  formBelongsToWorkspace: vi.fn(),
  responses: vi.fn(),
  mapResponses: vi.fn(),
  realMapper: null as null | typeof import("@/features/typeform/services/typeform.service").mapMaskedTypeformResponses,
  reveal: vi.fn(),
  audit: vi.fn(),
  auditCreate: vi.fn(),
  realAudit: null as null | typeof import("@/features/admin/audit/services/audit-log.service").createAuditLog,
}));

vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/features/admin/audit/services/audit-log.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/audit/services/audit-log.service")>();
  mocks.realAudit = actual.createAuditLog;
  return { ...actual, createAuditLog: mocks.audit };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: mocks.auditCreate },
    allowedUser: { findFirst: mocks.allowedUser },
    form: { findUnique: mocks.localForm },
    formWinner: { findMany: mocks.winners },
  },
}));
vi.mock("@/features/admin/workspaces/services/workspace-permissions", () => ({ getAuthorizedWorkspace: mocks.workspace }));
vi.mock("@/features/typeform/services/winner-reveal.service", () => ({
  requireWinnerRevealGrant: mocks.reveal,
  WinnerRevealDenied: class WinnerRevealDenied extends Error {
    constructor() { super("Confirma de nuevo la selección de ganadores para consultar sus datos."); }
  },
}));
vi.mock("@/features/typeform/services/typeform.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/typeform/services/typeform.service")>();
  mocks.realMapper = actual.mapMaskedTypeformResponses;
  return {
  ...actual,
  getTypeformForm: mocks.form,
  formBelongsToWorkspace: mocks.formBelongsToWorkspace,
  getTypeformFormResponses: mocks.responses,
  isTypeformNotFoundError: () => false,
  mapMaskedTypeformResponses: mocks.mapResponses,
  resolveWorkspaceTypeformId: async () => "remote-workspace",
  };
});

import { GET } from "./route";
import { WinnerRevealDenied } from "@/features/typeform/services/winner-reveal.service";

function requestExport(scope: "participants" | "winners", format = "xlsx", flowToken: string | null = scope === "winners" ? "active-flow" : null) {
  return GET(new Request(`https://app.example/export?scope=${scope}&format=${format}`, { headers: flowToken ? { "X-Winner-Flow": flowToken } : {} }), {
    params: Promise.resolve({ workspaceId: "workspace", formId: "form" }),
  });
}

async function readExportRows(response: Response, format: string) {
  const workbook = format === "csv"
    ? XLSX.read(await response.text(), { type: "string", raw: true })
    : XLSX.read(await response.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.audit.mockImplementation(mocks.realAudit!);
  mocks.user.mockResolvedValue({ id: "user", email: "editor@example.com", globalRole: "USER" });
  mocks.allowedUser.mockResolvedValue({ id: "allowed" });
  mocks.workspace.mockResolvedValue({ id: "workspace", typeformId: "remote-workspace", role: "EDITOR" });
  mocks.form.mockResolvedValue({ id: "form", title: "Sorteo de verano" });
  mocks.formBelongsToWorkspace.mockReturnValue(true);
  mocks.localForm.mockResolvedValue({ id: "local-form", workspaceId: "workspace" });
  mocks.winners.mockResolvedValue([{
    responseToken: "token", participantEmail: "ana@example.com",
    reason: "Sorteo", selectedAt: new Date("2026-11-04T12:00:00Z"),
  }]);
  mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token" }] });
  mocks.mapResponses.mockImplementation(mocks.realMapper!);
  mocks.reveal.mockImplementation(async (token: string) => {
    if (!token || token === "expired") throw new WinnerRevealDenied();
    return { grant: { responseTokens: ["token"] }, actor: { user: { id: "user", email: "editor@example.com" } } };
  });
});
afterEach(() => vi.restoreAllMocks());

describe("exportación de respuestas", () => {
  const metadata = ["participant_number", "token", "submitted_at", "contact", "selected_at", "winner_reason"];

  it.each([
    ["participants", "csv"], ["participants", "xlsx"],
    ["winners", "csv"], ["winners", "xlsx"],
  ] as const)("neutraliza valores de fórmula y controles sin alterar literales comunes en %s (%s)", async (scope, format) => {
    const dangerous = [
      '=HYPERLINK("https://example.test","abrir")', "+SUM(1,2)", "-1+2", "@SUM(1,2)",
      " =1+2", " \t+1+2", "\t=1+2", "\r-1+2", "\n@SUM(1,2)", "\r\n=1+2",
      "\u0000=1+2", "\u001f +1+2", "\u007f@SUM(1,2)", "\u00a0=1+2", "\u200b=1+2", "\ufeff=1+2",
      "\ttexto", "\rtexto", "\ntexto", " \u0001texto",
    ];
    const safe = ["Ana Pérez", "ana@example.test", "123", "2026-11-01T12:34:56Z", "Los Ríos", "  Texto normal", "O'Connor", 'Texto, con "comillas"', "Texto\nsegunda línea", "'Ya literal"];
    const values = [...dangerous, ...safe];
    mocks.form.mockResolvedValue({ id: "form", fields: [{ id: "comment", title: "Comentario" }] });
    mocks.responses.mockResolvedValue({ total_items: values.length, items: values.map((value) => ({
      token: value, answers: [{ field: { id: "comment" }, text: value }],
    })) });
    mocks.winners.mockResolvedValue(values.map((value) => ({ responseToken: value, participantEmail: value, reason: value, selectedAt: new Date("2026-11-04T12:00:00Z") })));
    mocks.reveal.mockResolvedValue({ grant: { responseTokens: values }, actor: { user: { id: "user" } } });
    const response = await requestExport(scope, format);
    expect(response.status).toBe(200);
    const csv = format === "csv" ? await response.text() : null;
    const workbook = format === "csv"
      ? XLSX.read(csv!, { type: "string", raw: true })
      : XLSX.read(await response.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    expect(rows).toHaveLength(values.length);
    values.forEach((value, index) => {
      const encoded = format === "csv" && index < dangerous.length ? `'${value}` : value;
      // SheetJS normaliza CRLF al leer CSV; comprobar además el literal exacto
      // en los bytes originales, sin trasladar esa normalización al exportador.
      if (csv !== null) expect(csv).toContain(`"${encoded.replaceAll('"', '""')}"`);
      // SheetJS 0.20 normaliza CRLF al leer XLSX; el CSV conserva los bytes originales (verificados arriba).
      const literal = encoded.replaceAll("\r\n", "\n");
      const read = (cell: unknown) => (typeof cell === "string" ? cell.replaceAll("\r\n", "\n") : cell);
      expect(read(rows[index].token)).toBe(literal);
      expect(read(rows[index].Comentario)).toBe(scope === "winners" ? literal : "****");
      expect(read(rows[index].winner_reason)).toBe(scope === "winners" ? literal : "");
      if (scope === "winners") expect(read(rows[index].contact)).toBe(literal);
      if (format === "xlsx") {
        expect(sheet[`B${index + 2}`]).toMatchObject({ t: "s", v: read(value) });
        if (scope === "winners") expect(sheet[`G${index + 2}`]).toMatchObject({ t: "s", v: read(value) });
      }
    });
    for (const [key, cell] of Object.entries(sheet)) {
      if (!key.startsWith("!")) expect(cell).not.toHaveProperty("f");
    }
  });

  it.each([
    ["participants", "csv"], ["participants", "xlsx"],
    ["winners", "csv"], ["winners", "xlsx"],
  ] as const)("protege cabeceras maliciosas del esquema en %s (%s)", async (scope, format) => {
    const titles = ["= SUM (1)", "@ SUM (1)", "+ SUM (1)", "- SUM (1)", "\t+ SUM (2)", " \r\n- SUM (2)", "\u0001+ SUM (3)", "Pregunta normal"];
    // = y @ se descartan ya al resolver etiquetas; +, - y controles
    // que sobreviven a esa capa también deben salir como literales seguros.
    const labels = ["Respuesta 1", "Respuesta 2", "+ SUM (1)", "- SUM (1)", "+ SUM (2)", "- SUM (2)", "\u0001+ SUM (3)", "Pregunta normal"];
    mocks.form.mockResolvedValue({ id: "form", fields: titles.map((title, index) => ({ id: `field-${index}`, title })) });
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token", answers: titles.map((_, index) => ({ field: { id: `field-${index}` }, text: "Texto seguro" })) }] });
    const response = await requestExport(scope, format);
    expect(response.status).toBe(200);
    const workbook = format === "csv"
      ? XLSX.read(await response.text(), { type: "string", raw: true })
      : XLSX.read(await response.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const expected = labels.map((label, index) => format === "csv" && index >= 2 && index <= 6 ? `'${label}` : label);
    expect(rows[0]).toEqual([...metadata, ...expected]);
    if (format === "xlsx") labels.forEach((label, index) => {
      expect(sheet[XLSX.utils.encode_cell({ r: 0, c: metadata.length + index })]).toMatchObject({ t: "s", v: label });
    });
    for (const [key, cell] of Object.entries(sheet)) {
      if (!key.startsWith("!")) expect(cell).not.toHaveProperty("f");
    }
  });

  it.each(["csv", "xlsx"])("integración: Prisma rechaza auditoría real y no se entrega archivo sensible (%s)", async (format) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auditCreate.mockRejectedValueOnce(new Error("DB-SECRET ana@example.com active-flow"));
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token", answers: [{ field: { ref: "nombre" }, text: "NOMBRE-PRIVADO" }], hidden: { secret: "HIDDEN-PRIVADO" } }] });
    const response = await requestExport("winners", format);
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ message: "No se pudo generar la exportación." });
    expect(mocks.auditCreate).toHaveBeenCalledExactlyOnceWith({ data: expect.objectContaining({
      action: "SENSITIVE_DATA_VIEWED", actorId: "user", metadata: expect.objectContaining({ scope: "winner_export", displayedResponses: 1 }),
    }) });
    expect(log.mock.calls).toEqual([["[AUDIT] Failed to create audit log"], ["[RESPONSES_EXPORT_ERROR]"]]);
    expect(mocks.reveal).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["csv", "falta uno"], ["xlsx", "falta uno"],
    ["csv", "faltan todos"], ["xlsx", "faltan todos"],
    ["csv", "total cero"], ["xlsx", "total cero"],
    ["csv", "sin persistido"], ["xlsx", "sin persistido"],
    ["csv", "grant vacío"], ["xlsx", "grant vacío"],
    ["csv", "token vacío"], ["xlsx", "token vacío"],
    ["csv", "token duplicado"], ["xlsx", "token duplicado"],
    ["csv", "proyección parcial"], ["xlsx", "proyección parcial"],
    ["csv", "proyección vacía"], ["xlsx", "proyección vacía"],
    ["csv", "proyección duplicada"], ["xlsx", "proyección duplicada"],
    ["csv", "proyección ajena"], ["xlsx", "proyección ajena"],
    ["csv", "proyección anónima"], ["xlsx", "proyección anónima"],
  ])("rechaza el conjunto autorizado incompleto sin archivo ni PII (%s, %s)", async (format, scenario) => {
    const tokens = ["token", "TOKEN-PRIVADO"];
    const persisted = tokens.map((responseToken) => ({ responseToken, participantEmail: "NOMBRE-PRIVADO@example.test", reason: "MOTIVO-PRIVADO", selectedAt: new Date("2026-11-04T12:00:00Z") }));
    mocks.winners.mockResolvedValue(scenario === "sin persistido" ? persisted.slice(0, 1) : persisted);
    const grantTokens = scenario === "grant vacío" ? [] : scenario === "token vacío" ? ["token", " "] : scenario === "token duplicado" ? ["token", "token"] : tokens;
    mocks.reveal.mockResolvedValue({ grant: { responseTokens: grantTokens }, actor: { user: { id: "user" } } });
    const rawTokens = scenario === "falta uno" ? ["token"] : scenario === "faltan todos" ? ["other"] : scenario === "total cero" ? [] : tokens;
    mocks.responses.mockResolvedValue({ total_items: rawTokens.length, items: rawTokens.map((token) => ({ token, answers: [{ field: { ref: "nombre" }, text: "NOMBRE-PRIVADO" }] })) });
    if (scenario.startsWith("proyección")) mocks.mapResponses.mockImplementation((...args: Parameters<NonNullable<typeof mocks.realMapper>>) => {
      const mapped = mocks.realMapper!(...args);
      if (scenario === "proyección parcial") return mapped.slice(0, 1);
      if (scenario === "proyección vacía") return [];
      if (scenario === "proyección duplicada") return [mapped[0], mapped[0]];
      if (scenario === "proyección ajena") return [mapped[0], { ...mapped[1], token: "other" }];
      return [mapped[0], { ...mapped[1], visibility: "anonymous" }];
    });
    const response = await requestExport("winners", format);
    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const content = await response.text();
    expect(JSON.parse(content)).toEqual({ message: "No se puede exportar: faltan respuestas de ganadores o el conjunto está incompleto. Vuelve a consultar los ganadores guardados." });
    expect(content).not.toMatch(/TOKEN-PRIVADO|NOMBRE-PRIVADO|MOTIVO-PRIVADO|@example|other/);
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  function realFormFixture() {
    mocks.form.mockResolvedValue({ id: "form", title: "Sorteo", fields: [
      { id: "contact-group", title: "Contacto", properties: { fields: [
        { id: "name", ref: "first_name", title: "Nombres" },
        { id: "last", title: "Primer apellido" },
        { id: "second-last", title: "Segundo apellido" },
        { id: "rut", title: "RUT:" },
        { id: "email", ref: "email", title: "Correo electrónico", type: "email" },
        { id: "phone", ref: "phone_number", title: "Teléfono" },
      ] } },
      { id: "location-group", title: "Ubicación", fields: [
        { id: "region", title: "Región" },
        { id: "city", title: "Comuna" },
      ] },
    ] });
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{
      token: "token", submitted_at: "2026-11-01T12:34:56Z",
      answers: [{ answers: [
        { field: { id: "name" }, text: "María Elena" },
        { field: { id: "last" }, text: "González" },
        { field: { id: "second-last" }, text: "Pérez" },
        { field: { id: "rut" }, text: "12.345.678-9" },
        { field: { id: "email" }, type: "email", email: "maria@privado.test" },
        { field: { id: "phone" }, type: "phone_number", phone_number: "+56912345678" },
      ] }, { field: { id: "region" }, choice: { label: "Los Ríos" } },
      { field: { id: "city" }, text: "Valdivia" }],
      hidden: { email: "HIDDEN@privado.test", city: "CIUDAD-HIDDEN", secret: "HIDDEN-SECRETO" },
    }] });
  }

  it.each(["csv", "xlsx"])("exporta cabeceras reales anidadas y seis metadatos sin duplicar perfiles (%s)", async (format) => {
    realFormFixture();
    const response = await requestExport("participants", format, "active-flow");
    expect(response.status).toBe(200);
    const rows = await readExportRows(response, format);
    expect(Object.keys(rows[0])).toEqual([...metadata, "Nombres", "Primer apellido", "Segundo apellido", "RUT:", "Correo electrónico", "Teléfono", "Región", "Comuna"]);
    expect(rows).toEqual([{
      participant_number: format === "csv" ? "1" : 1, token: "token",
      submitted_at: "2026-11-01T12:34:56Z", contact: "mar*****", selected_at: "", winner_reason: "",
      Nombres: "Ma****", "Primer apellido": "Go****", "Segundo apellido": "Pé****", "RUT:": "****",
      "Correo electrónico": "mar*****", "Teléfono": "****", "Región": "Los Ríos", Comuna: "Valdivia",
    }]);
    expect(JSON.stringify(rows)).not.toMatch(/María|González|Pérez|12\.345\.678|56912345678|maria@|privado\.test|HIDDEN|Instagram/);
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.reveal).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["csv", "xlsx"])("ganadores con grant exportan campos reales completos y fecha con auditoría (%s)", async (format) => {
    realFormFixture();
    const response = await requestExport("winners", format);
    const rows = await readExportRows(response, format);
    expect(Object.keys(rows[0])).toEqual([...metadata, "Nombres", "Primer apellido", "Segundo apellido", "RUT:", "Correo electrónico", "Teléfono", "Región", "Comuna"]);
    expect(rows[0]).toMatchObject({ Nombres: "María Elena", "Primer apellido": "González", "Segundo apellido": "Pérez", "RUT:": "12.345.678-9", "Correo electrónico": "maria@privado.test", "Teléfono": format === "csv" ? "'+56912345678" : "+56912345678", "Región": "Los Ríos", Comuna: "Valdivia", submitted_at: "2026-11-01T12:34:56Z", selected_at: "2026-11-04T12:00:00.000Z", winner_reason: "Sorteo" });
    expect(JSON.stringify(rows)).not.toMatch(/HIDDEN|Instagram/);
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it.each(["csv", "xlsx"])("Instagram solo existe si pertenece al formulario y se enmascara para participantes (%s)", async (format) => {
    mocks.form.mockResolvedValue({ id: "form", fields: [{ id: "social", title: "Instagram" }] });
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token", answers: [{ field: { id: "social" }, text: "@persona_privada" }] }] });
    const participants = await readExportRows(await requestExport("participants", format), format);
    expect(Object.keys(participants[0])).toEqual([...metadata, "Instagram"]);
    expect(participants[0].Instagram).toBe("****");
    const winners = await readExportRows(await requestExport("winners", format), format);
    expect(winners[0].Instagram).toBe(format === "csv" ? "'@persona_privada" : "@persona_privada");
  });

  it.each(["csv", "xlsx"])("separa títulos duplicados e identidades opacas incluso con respuestas reordenadas (%s)", async (format) => {
    mocks.form.mockResolvedValue({ id: "form", fields: [
      { id: "Ab7xQ9mLp2", title: "Preferencia" },
      { id: "Zb8xQ9mLp3", title: "Preferencia" },
      { id: "Qb9xQ9mLp4", title: "Ab7xQ9mLp2" },
      { id: "unanswered", title: "Pregunta sin respuesta" },
      { id: "collision", title: "contact" },
    ] });
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token", answers: [
      { field: { id: "Zb8xQ9mLp3" }, text: "SEGUNDO-VALOR" },
      { field: { id: "Qb9xQ9mLp4" }, text: "TERCER-VALOR" },
      { field: { id: "Ab7xQ9mLp2" }, text: "PRIMER-VALOR" },
    ] }] });
    const winners = await readExportRows(await requestExport("winners", format), format);
    expect(Object.keys(winners[0])).toEqual([...metadata, "Preferencia", "Preferencia (2)", "Respuesta 3", "Pregunta sin respuesta", "Respuesta 5"]);
    expect(winners[0]).toMatchObject({ Preferencia: "PRIMER-VALOR", "Preferencia (2)": "SEGUNDO-VALOR", "Respuesta 3": "TERCER-VALOR", "Pregunta sin respuesta": "" });
    const participants = await readExportRows(await requestExport("participants", format), format);
    expect(participants[0]).toMatchObject({ Preferencia: "****", "Preferencia (2)": "****", "Respuesta 3": "****" });
    expect(JSON.stringify(participants)).not.toMatch(/VALOR|Ab7xQ9mLp2|Zb8xQ9mLp3|Qb9xQ9mLp4/);
  });

  it.each(["csv", "xlsx"])("conserva participantes 4 y 10 al exportar solo ganadores (%s)", async (format) => {
    const items = Array.from({ length: 10 }, (_, index) => ({ token: `participant-${index + 1}`, submitted_at: `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00Z` }));
    mocks.responses.mockResolvedValue({ total_items: 10, items: [...items].reverse() });
    mocks.winners.mockResolvedValue([4, 10].map((number) => ({ responseToken: `participant-${number}`, selectedAt: new Date("2026-11-09T12:00:00Z"), reason: "Sorteo" })));
    mocks.reveal.mockResolvedValue({ grant: { responseTokens: ["participant-4", "participant-10"] }, actor: { user: { id: "user" } } });
    const all = await readExportRows(await requestExport("participants", format), format);
    const winners = await readExportRows(await requestExport("winners", format), format);
    expect(winners.map((row) => String(row.participant_number))).toEqual(["10", "4"]);
    for (const winner of winners) expect(winner.participant_number).toBe(all.find((row) => row.token === winner.token)?.participant_number);
    expect(winners.every((row) => row.submitted_at)).toBe(true);
  });

  it.each(["csv", "xlsx"])("ubicación visible exige campo real: no acepta hidden, refs inyectadas ni regiones desconocidas (%s)", async (format) => {
    mocks.form.mockResolvedValue({ id: "form", fields: [
      { id: "private", title: "Comentario privado" },
      { id: "region", title: "Región" },
      { id: "town", title: "Ciudad" },
    ] });
    mocks.responses.mockResolvedValue({ total_items: 2, items: [
      { token: "token", answers: [
        { field: { id: "private", ref: "city" }, text: "APELLIDO PRIVADO" },
        { field: { id: "region" }, text: "Los Ríos CORREO-PRIVADO" },
        { field: { id: "town" }, text: "Puerto Varas" },
        { field: { ref: "comuna" }, text: "CIUDAD INYECTADA" },
      ], hidden: { city: "HIDDEN-CITY", region: "Los Lagos", email: "hidden@privado.test" } },
      { token: "only-hidden", hidden: { city: "HIDDEN-CITY", email: "hidden@privado.test" } },
    ] });
    const rows = await readExportRows(await requestExport("participants", format), format);
    expect(rows[0]).toMatchObject({ "Comentario privado": "****", "Región": "****", Ciudad: "Puerto Varas", Comuna: "****", contact: "" });
    expect(rows[1]).toMatchObject({ contact: "", Ciudad: "" });
    expect(JSON.stringify(rows)).not.toMatch(/APELLIDO|PRIVADO|INYECTADA|HIDDEN|Los Lagos|privado\.test/);
  });

  it.each(["csv", "xlsx"])("sin preguntas de nombre/correo no inventa perfiles y usa contacto enmascarado desde answers (%s)", async (format) => {
    mocks.form.mockResolvedValue({ id: "form", fields: [{ id: "opaque", title: "Dato de contacto", type: "email" }] });
    mocks.responses.mockResolvedValue({ total_items: 1, items: [{ token: "token", answers: [{ type: "email", field: { id: "opaque" }, email: "correo@privado.test" }], hidden: { email: "hidden@privado.test" } }] });
    const rows = await readExportRows(await requestExport("participants", format), format);
    expect(Object.keys(rows[0])).toEqual([...metadata, "Dato de contacto"]);
    expect(rows[0]).toMatchObject({ contact: "cor*****", "Dato de contacto": "cor*****", selected_at: "", winner_reason: "" });
    expect(JSON.stringify(rows)).not.toMatch(/privado|hidden|ana@example/);
  });

  it.each([
    ["participants", "xlsx", "participantes"],
    ["winners", "xlsx", "ganadores"],
    ["participants", "csv", "participantes"],
    ["winners", "csv", "ganadores"],
  ] as const)("incluye nombre e ID en la descarga de %s (%s)", async (scope, format, prefix) => {
    const response = await requestExport(scope, format);
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="${prefix}-sorteo-de-verano-form.${format}"`,
    );
  });

  it.each([
    ["  ¡Gana en Viña! / Edición: \"Verano\"  ", "gana-en-vina-edicion-verano"],
    ["Sorteo\r\nX-Header: prueba", "sorteo-x-header-prueba"],
    ["", "concurso"],
    [null, "concurso"],
    [undefined, "concurso"],
    ["🎉 / :", "concurso"],
    ["a".repeat(200), "a".repeat(100)],
  ])("normaliza el título %j para un nombre de archivo seguro", async (title, expected) => {
    mocks.form.mockResolvedValue({ id: "form", title });
    const response = await requestExport("participants");
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="participantes-${expected}-form.xlsx"`,
    );
  });

  it.each(["xlsx", "csv"])("no filtra el correo persistido de un ganador al exportar participantes (%s)", async (format) => {
    const response = await requestExport("participants", format);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.reveal).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();

    if (format === "csv") {
      const csv = await response.text();
      expect(csv).not.toContain("a***@e***.com");
      expect(csv).not.toContain("ana@example.com");
    } else {
      const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Participantes);
      expect(rows).toEqual([expect.objectContaining({ participant_number: 1, token: "token", contact: "", submitted_at: "" })]);
      expect(JSON.stringify(rows)).not.toContain("ana@example.com");
      expect(response.headers.get("Content-Disposition")).toContain("participantes-sorteo-de-verano-form.xlsx");
    }
  });

  it("mantiene el contacto completo para los ganadores autorizados", async () => {
    const response = await requestExport("winners");
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Ganadores)).toEqual([
      expect.objectContaining({ contact: "ana@example.com", winner_reason: "Sorteo" }),
    ]);
    expect(mocks.mapResponses).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), { maskSensitive: true, unmaskTokens: new Set(["token"]) },
    );
  });

  it.each([null, "expired"])("ganadores persistidos no bastan para exportar sin un flujo activo: %s", async (flowToken) => {
    const response = await requestExport("winners", "xlsx", flowToken);
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("vuelve a comprobar el flujo antes de devolver una exportación sensible", async () => {
    mocks.reveal.mockResolvedValueOnce({ grant: { responseTokens: ["token"] } }).mockRejectedValueOnce(new WinnerRevealDenied());
    const response = await requestExport("winners", "csv");
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("ana@example.com");
  });

  it("rechaza usuarios sin sesión", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await requestExport("participants")).status).toBe(401);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("rechaza usuarios fuera de la lista autorizada", async () => {
    mocks.allowedUser.mockResolvedValue(null);
    expect((await requestExport("participants")).status).toBe(403);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("rechaza viewers aunque accedan directamente al endpoint", async () => {
    mocks.workspace.mockResolvedValue({ role: "VIEWER" });
    expect((await requestExport("participants")).status).toBe(403);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("rechaza formularios ajenos al workspace", async () => {
    mocks.formBelongsToWorkspace.mockReturnValue(false);
    expect((await requestExport("participants")).status).toBe(404);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("rechaza también un formulario vinculado localmente a otro workspace", async () => {
    mocks.localForm.mockResolvedValueOnce({ id: "local-form", workspaceId: "foreign" });
    expect((await requestExport("winners")).status).toBe(404);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it.each(["csv", "xlsx"])("oculta texto libre y hidden pero conserva la fecha real de envío (%s)", async (format) => {
    mocks.responses.mockResolvedValueOnce({ total_items: 2, items: [
      { token: "token", submitted_at: "2026-11-01T12:34:56Z", answers: [{ type: "text", field: { ref: "comentario" }, text: "PII-GANADOR" }], hidden: { email: "privado@example.test" } },
      { token: "other", submitted_at: "2026-11-02T12:34:56Z", answers: [{ type: "text", field: { ref: "comentario" }, text: "PII-NO-GANADOR" }], hidden: { telefono: "SECRETO-HIDDEN" } },
    ] });
    const response = await requestExport("participants", format);
    const content = format === "csv" ? await response.text() : JSON.stringify(XLSX.utils.sheet_to_json(XLSX.read(await response.arrayBuffer(), { type: "array" }).Sheets.Participantes));
    expect(content).not.toContain("PII-");
    expect(content).not.toContain("SECRETO-HIDDEN");
    expect(content).not.toContain("privado@example.test");
    expect(content).toContain("2026-11-01T12:34:56Z");
    expect(content).toContain("2026-11-02T12:34:56Z");
  });

  it.each(["csv", "xlsx"])("exporta solo perfiles enmascarados, también para un ganador persistido (%s)", async (format) => {
    mocks.form.mockResolvedValue({ id: "form", title: "Sorteo", fields: [
      { id: "name", title: "Nombre completo" },
      { id: "email", title: "Correo electrónico" },
      { id: "region", title: "Región" },
      { id: "city", title: "Comuna" },
      { id: "comment", title: "Comentario privado" },
      { id: "date", title: "Fecha de nacimiento" },
    ] });
    mocks.responses.mockResolvedValueOnce({ total_items: 2, items: [
      { token: "token", submitted_at: "2026-11-01T12:34:56Z", landed_at: "2026-11-01T12:30:00Z", answers: [
        { field: { id: "name" }, text: "María ApellidoPrivado" },
        { field: { id: "email" }, type: "email", email: "maria@dominio-privado.test" },
        { field: { id: "region" }, choice: { label: "Los Ríos" } },
        { field: { id: "city" }, text: "Valdivia" },
        { field: { id: "comment" }, text: "COMENTARIO-SECRETO" },
        { field: { id: "date" }, type: "date", date: "1990-02-03" },
      ], hidden: { email: "hidden@privado.test", nombre: "NOMBRE-HIDDEN", region: "REGION-HIDDEN" } },
      { token: "other", answers: [
        { type: "contact_info", contact_info: { first_name: "Beatriz", last_name: "Privada", email: "beatriz@otro-privado.test", phone_number: "TELEFONO-SECRETO" } },
        { type: "address", address: { address_line_1: "CALLE-SECRETA", city: "Puerto Varas", state: "Los Lagos", country: "PAIS-SECRETO", zip_code: "CODIGO-SECRETO" } },
      ] },
    ] });

    const response = await requestExport("participants", format);
    expect(response.status).toBe(200);
    const rows = await readExportRows(response, format);
    expect(rows).toEqual([
      expect.objectContaining({ token: "token", submitted_at: "2026-11-01T12:34:56Z", contact: "mar*****", selected_at: "", winner_reason: "", "Nombre completo": "Ma****", "Correo electrónico": "mar*****", "Región": "Los Ríos", "Comuna": "Valdivia", "Comentario privado": "****", "Fecha de nacimiento": "****" }),
      expect.objectContaining({ token: "other", submitted_at: "", contact: "bea*****", selected_at: "", winner_reason: "" }),
    ]);
    const content = JSON.stringify(rows);
    for (const secret of ["María", "ApellidoPrivado", "maria@", "dominio-privado", "Beatriz", "Privada", "beatriz@", "otro-privado", "Puerto Varas", "Los Lagos", "SECRETO", "SECRETA", "HIDDEN", "hidden@", "ana@example.com", "1990-02-03", "answers", "hidden"]) {
      expect(content).not.toContain(secret);
    }
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.reveal).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["csv", "xlsx"])("no inventa perfiles desde hidden ni revela valores de uno o dos caracteres (%s)", async (format) => {
    mocks.responses.mockResolvedValueOnce({ total_items: 2, items: [
      { token: "short", answers: [
        { field: { ref: "nombre" }, text: "Al" },
        { type: "email", field: { ref: "email" }, email: "a@privado.test" },
        { field: { ref: "region" }, text: "Ñ" },
        { field: { ref: "comuna" }, text: "Li" },
      ] },
      { token: "hidden-only", hidden: { nombre: "HIDDEN-NOMBRE", email: "hidden@privado.test", region: "Los Ríos", comuna: "Valdivia" } },
    ] });
    const rows = await readExportRows(await requestExport("participants", format), format);
    expect(rows[0]).toMatchObject({ Nombre: "A****", "Correo electrónico": "*****", contact: "*****", "Región": "****", Comuna: "****" });
    expect(rows[1]).toMatchObject({ Nombre: "", "Correo electrónico": "", contact: "", "Región": "", Comuna: "", submitted_at: "" });
    expect(JSON.stringify(rows)).not.toMatch(/HIDDEN|privado|Los Ríos|Valdivia/);
  });

  it.each(["csv", "xlsx"])("recupera todas las páginas cortas y conserva tokens distintos aunque compartan email (%s)", async (format) => {
    const answer = { type: "email", field: { ref: "email" }, email: "compartido@privado.test" };
    mocks.responses
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "first", answers: [answer] }] })
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "first", answers: [answer] }, { token: "second", answers: [answer] }] })
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "third" }] });
    const response = await requestExport("participants", format);
    expect(response.status).toBe(200);
    const rows = await readExportRows(response, format);
    expect(rows.map((row) => row.token)).toEqual(["first", "second", "third"]);
    expect(rows.map((row) => String(row.participant_number))).toEqual(["1", "3", "2"]);
    expect(mocks.responses).toHaveBeenCalledTimes(3);
    expect(mocks.responses).toHaveBeenNthCalledWith(1, "form", { pageSize: 100, before: undefined });
    expect(mocks.responses).toHaveBeenNthCalledWith(2, "form", { pageSize: 100, before: "first" });
    expect(mocks.responses).toHaveBeenNthCalledWith(3, "form", { pageSize: 100, before: "second" });
    expect(JSON.stringify(rows)).not.toContain("compartido@privado.test");
  });

  it.each([
    ["participants", "csv"], ["participants", "xlsx"],
    ["winners", "csv"], ["winners", "xlsx"],
  ] as const)("rechaza la descarga parcial de %s (%s) si faltan respuestas", async (scope, format) => {
    mocks.responses
      .mockResolvedValueOnce({ total_items: 2, items: [{ token: "token" }] })
      .mockResolvedValueOnce({ total_items: 2, items: [] });
    const response = await requestExport(scope, format);
    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ message: "No se pudo generar la exportación." });
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rechaza cursores repetidos en lugar de exportar un subconjunto", async () => {
    mocks.responses.mockResolvedValue({ total_items: 2, items: [{ token: "token" }] });
    const response = await requestExport("participants", "csv");
    expect(response.status).toBe(500);
    expect(mocks.responses).toHaveBeenCalledTimes(2);
  });

  it("no confunde una primera página vacía con total positivo con ausencia de participantes", async () => {
    mocks.responses.mockResolvedValue({ total_items: 2, items: [] });
    expect((await requestExport("participants")).status).toBe(500);
  });

  it("informa de ausencia de participantes solo si el total remoto es cero", async () => {
    mocks.responses.mockResolvedValue({ total_items: 0, items: [] });
    const response = await requestExport("participants");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "No hay participantes para exportar." });
  });

  it("exporta texto completo únicamente de los tokens de ganadores persistidos", async () => {
    mocks.responses.mockResolvedValueOnce({ total_items: 2, items: [
      { token: "token", answers: [{ type: "text", field: { ref: "comentario" }, text: "DATO-GANADOR" }] },
      { token: "other", answers: [{ type: "text", field: { ref: "comentario" }, text: "DATO-NO-GANADOR" }] },
    ] });
    const response = await requestExport("winners", "csv");
    const csv = await response.text();
    expect(csv).toContain("DATO-GANADOR");
    expect(csv).not.toContain("DATO-NO-GANADOR");
  });

  it.each(["csv", "xlsx"])("conserva actor, motivos y respuestas completas solo para ganadores incluidos en el grant (%s)", async (format) => {
    mocks.winners.mockResolvedValue([
      { responseToken: "token", participantEmail: "ana@example.com", reason: "Selección editorial", selectedAt: new Date("2026-11-04T12:00:00Z") },
      { responseToken: "second", participantEmail: "bea@example.com", reason: "Sorteo aleatorio", selectedAt: new Date("2026-11-05T12:00:00Z") },
      { responseToken: "excluded", participantEmail: "excluido@example.com", reason: "MOTIVO-EXCLUIDO", selectedAt: new Date("2026-11-06T12:00:00Z") },
    ]);
    mocks.reveal.mockResolvedValue({ grant: { responseTokens: ["token", "second"] }, actor: { user: { id: "user", email: "editor@example.com", name: "Editor" } } });
    mocks.responses.mockResolvedValue({ total_items: 3, items: [
      { token: "token", submitted_at: "2026-11-01T12:34:56Z", answers: [{ field: { ref: "comentario" }, text: "RESPUESTA-COMPLETA" }] },
      { token: "second", answers: [{ field: { ref: "comentario" }, text: "SEGUNDA-COMPLETA" }] },
      { token: "excluded", answers: [{ field: { ref: "comentario" }, text: "RESPUESTA-EXCLUIDA" }] },
    ] });
    const response = await requestExport("winners", format);
    expect(response.status).toBe(200);
    const rows = await readExportRows(response, format);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ contact: "ana@example.com", submitted_at: "2026-11-01T12:34:56Z", selected_at: "2026-11-04T12:00:00.000Z", winner_reason: "Selección editorial" });
    const serialized = JSON.stringify(rows);
    expect(serialized).toContain("RESPUESTA-COMPLETA");
    expect(serialized).toContain("SEGUNDA-COMPLETA");
    expect(serialized).not.toMatch(/excluido|EXCLUID/);
    expect(mocks.reveal).toHaveBeenCalledTimes(3);
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      action: "SENSITIVE_DATA_VIEWED",
      required: true,
      actor: { id: "user", email: "editor@example.com", name: "Editor" },
      target: { type: "form_winner_data", id: "form" },
      context: {
        workspaceId: "workspace", formId: "form", formTitle: "Sorteo de verano",
        metadata: {
          scope: "winner_export", format, displayedResponses: 2, revealedTokens: "token,second",
          reasons: JSON.stringify([
            { responseToken: "token", reason: "Selección editorial" },
            { responseToken: "second", reason: "Sorteo aleatorio" },
          ]),
        },
      },
    });
  });

  it("no entrega el archivo sensible si el grant expira durante la auditoría", async () => {
    mocks.audit.mockImplementationOnce(async () => {
      mocks.reveal.mockRejectedValue(new WinnerRevealDenied());
    });
    const response = await requestExport("winners", "csv");
    expect(response.status).toBe(403);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(await response.text()).not.toContain("ana@example.com");
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.reveal).toHaveBeenCalledTimes(3);
  });

  it("informa cuando no hay ganadores", async () => {
    mocks.winners.mockResolvedValue([]);
    const response = await requestExport("winners");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "No hay ganadores para exportar." });
    expect(mocks.responses).not.toHaveBeenCalled();
  });
});