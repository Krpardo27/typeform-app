import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WinnerSelectionPanelProps } from "@/features/typeform/components/responses/winner-selection/types";
import { WinnerCandidatesTable } from "@/features/typeform/components/responses/winner-selection/WinnerCandidatesTable";
import { LOS40_TEMPLATE_FORM_ID } from "@/features/typeform/utils/embed-info";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), membership: vi.fn(), localForm: vi.fn(), winners: vi.fn(),
  responses: vi.fn(), form: vi.fn(), audit: vi.fn(),
  list: vi.fn(), panel: vi.fn(), cookies: vi.fn(),
  confirm: vi.fn(), begin: vi.fn(), readParticipant: vi.fn(), readWinner: vi.fn(), finish: vi.fn(),
}));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({ getWorkspaceAccessContext: mocks.access }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  userWorkspace: { findUnique: mocks.membership },
  form: { findUnique: mocks.localForm }, formWinner: { findMany: mocks.winners },
} }));
vi.mock("@/features/typeform/services/load-form-responses", () => ({ loadFormResponses: mocks.responses }));
vi.mock("@/features/typeform/services/typeform.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/typeform/services/typeform.service")>(),
  getTypeformForm: mocks.form,
  formBelongsToWorkspace: () => true,
  isTypeformNotFoundError: () => false,
  resolveWorkspaceTypeformId: async () => "remote-workspace",
}));
vi.mock("@/features/typeform/actions/select-winners.action", () => ({ confirmWinnersForRevealAction: mocks.confirm }));
vi.mock("@/features/typeform/actions/winner-reveal.action", () => ({
  beginSavedWinnerDataAction: mocks.begin,
  readParticipantDataAction: mocks.readParticipant,
  readWinnerDataAction: mocks.readWinner,
  finishWinnerDataAction: mocks.finish,
}));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("@/features/typeform/components/responses/WorkspaceFormResponsesHeader", () => ({ WorkspaceFormResponsesHeader: () => <h1>Respuestas del concurso</h1> }));
vi.mock("@/features/typeform/components/responses/WinnerSelectionPanel", () => ({ WinnerSelectionPanel: (props: unknown) => { mocks.panel(props); return <div>Selección de ganadores</div>; } }));
vi.mock("@/features/typeform/components/responses/WorkspaceFormResponsesList", () => ({
  WorkspaceFormResponsesList: (props: { responses: unknown[] }) => {
    mocks.list(props);
    return <div data-testid="responses-list" data-loaded={props.responses.length} />;
  },
}));

import FormResponsesPage from "./page";
import ResponsesError from "./error";

async function renderPage(searchParams: { page?: string; pageSize?: string; winnerRegionFilter?: string; winnerSelection?: string; winnerError?: string } = {}) {
  return renderToStaticMarkup(await FormResponsesPage({
    params: Promise.resolve({ workspaceId: "workspace", formId: "form" }),
    searchParams: Promise.resolve(searchParams),
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", undefined);
  vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", undefined);
  mocks.access.mockResolvedValue({ user: { id: "user", globalRole: "USER" }, workspace: { id: "workspace", name: "Radio", role: "EDITOR" } });
  mocks.membership.mockResolvedValue({ role: "EDITOR" });
  mocks.localForm.mockResolvedValue({ id: "local", workspaceId: "workspace" });
  mocks.winners.mockResolvedValue([]);
  mocks.form.mockResolvedValue({ id: "form", title: "Concurso" });
  mocks.responses.mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ token: `token-${index}` })));
  mocks.cookies.mockResolvedValue({ get: () => undefined });
});
afterEach(() => vi.unstubAllEnvs());

describe("FormResponsesPage en preview fixture", () => {
  beforeEach(() => {
    vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", "fixture");
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", " form ");
    mocks.responses.mockResolvedValue([{ token: "fake-a" }, { token: "fake-b" }]);
    // Incluye coincidencia con fixture y huérfano: ninguno debe consumirse.
    mocks.winners.mockResolvedValue([
      { responseToken: "fake-a", participantEmail: "REAL-CONTACT", selectedAt: new Date() },
      { responseToken: "real-missing", participantEmail: "ORPHAN-CONTACT", selectedAt: new Date() },
    ]);
  });

  it("omite formWinner y solo proyecta candidatos ficticios sin selección ni ausentes", async () => {
    const html = await renderPage();
    const props = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
    expect(mocks.responses).toHaveBeenCalledExactlyOnceWith("form");
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(props.isFixturePreview).toBe(true);
    expect(props.candidates.map(({ token }) => token)).toEqual(["fake-a", "fake-b"]);
    for (const candidate of props.candidates) {
      expect(candidate.selected).toBe(false);
      expect(candidate.missingResponse).toBeUndefined();
    }
    expect(clientPayload()).not.toMatch(/real-missing|REAL-CONTACT|ORPHAN-CONTACT/);
    expect(html).not.toContain("No hay respuestas disponibles");
    for (const operation of [mocks.confirm, mocks.begin, mocks.readWinner, mocks.finish, mocks.audit]) {
      expect(operation).not.toHaveBeenCalled();
    }
  });

  it("un fixture vacío no convierte ganadores reales en ausentes ni monta un panel guardado", async () => {
    mocks.responses.mockResolvedValue([]);
    const html = await renderPage();
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.panel).not.toHaveBeenCalled();
    expect(html).toContain("Aún no hay participantes");
    expect(html).not.toMatch(/No hay respuestas disponibles|guardados se conservan|real-missing/);
  });

  it("el preview de otro formulario no oculta los ganadores de este concurso", async () => {
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", "other");
    await renderPage();
    const props = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
    expect(mocks.winners).toHaveBeenCalledOnce();
    expect(props.isFixturePreview).toBe(false);
    expect(props.candidates.find(({ token }) => token === "fake-a")?.selected).toBe(true);
    expect(props.candidates.find(({ token }) => token === "real-missing")).toMatchObject({ selected: true, missingResponse: true });
  });

  it("en producción conserva la consulta de ganadores aunque SOURCE y FORM_IDS pidan fixture", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await renderPage();
    const props = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
    expect(props.isFixturePreview).toBe(false);
    expect(mocks.winners).toHaveBeenCalledOnce();
    expect(props.candidates.find(({ token }) => token === "fake-a")?.selected).toBe(true);
  });
});

describe("FormResponsesPage", () => {
  it("firma opaca estable por tokens/selectedAt y formulario local sin exponer fechas ni motivos", async () => {
    const rows = [
      { responseToken: "token-0", selectedAt: new Date("2026-11-01T10:00:00Z"), reason: "MOTIVO-PRIVADO" },
      { responseToken: "token-1", selectedAt: new Date("2026-11-01T11:00:00Z"), reason: "OTRO-MOTIVO" },
    ];
    mocks.winners.mockResolvedValue(rows);
    await renderPage();
    const first = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
    expect(first.winnerRevision).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.winners).toHaveBeenCalledWith(expect.objectContaining({
      select: { responseToken: true, selectedAt: true },
    }));
    expect(JSON.stringify(first)).not.toMatch(/2026-11-01|MOTIVO-PRIVADO|OTRO-MOTIVO|selectedAt|reason/);
    for (const candidate of first.candidates) {
      expect(candidate).not.toHaveProperty("selectedAt");
      expect(candidate).not.toHaveProperty("reason");
    }
    mocks.winners.mockResolvedValue([...rows].reverse());
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).toBe(first.winnerRevision);
    mocks.winners.mockResolvedValue(rows.map((row) => ({ ...row, reason: "Motivo sin fecha nueva" })));
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).toBe(first.winnerRevision);
    mocks.winners.mockResolvedValue([{ ...rows[0], selectedAt: new Date("2026-11-01T10:00:00.001Z") }, rows[1]]);
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).not.toBe(first.winnerRevision);
    mocks.winners.mockResolvedValue(rows);
    mocks.localForm.mockResolvedValue({ id: "otro-local", workspaceId: "workspace" });
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).not.toBe(first.winnerRevision);
  });

  it("sin selectedAt usa null estable y tolera fechas inválidas en mocks antiguos", async () => {
    mocks.winners.mockResolvedValue([{ responseToken: "token-0" }, { responseToken: "token-1" }]);
    await renderPage();
    const revision = mocks.panel.mock.calls.at(-1)![0].winnerRevision;
    mocks.winners.mockResolvedValue([
      { responseToken: "token-1", selectedAt: new Date(NaN) },
      { responseToken: "token-0", selectedAt: null },
    ]);
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).toBe(revision);
    mocks.winners.mockResolvedValue([{ responseToken: "token-2" }]);
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].winnerRevision).not.toBe(revision);
  });

  it.each(["EDITOR", "VIEWER"])("%s puede abrir el formulario público sin participantes ni panel", async (role) => {
    mocks.membership.mockResolvedValue({ role });
    mocks.responses.mockResolvedValue([]);
    mocks.form.mockResolvedValue({ id: "actual", title: "Concurso", _links: { display: "https://example.test/to/actual" } });
    const html = await renderPage();
    expect(html).toContain('href="https://example.test/to/actual"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Abrir formulario en una nueva pestaña"');
    expect(html.match(/Abrir formulario<svg/g)).toHaveLength(1);
    expect(mocks.panel).not.toHaveBeenCalled();
    for (const operation of [mocks.begin, mocks.readWinner, mocks.finish, mocks.confirm]) expect(operation).not.toHaveBeenCalled();
  });

  it("monta el panel con ganadores ausentes aunque no existan respuestas, con referencias estables sin contactos", async () => {
    mocks.responses.mockResolvedValue([]);
    mocks.winners.mockResolvedValue([
      { responseToken: "secret-z", participantEmail: "NO-MOSTRAR" },
      { responseToken: "secret-a", participantEmail: "TAMPOCO" },
    ]);
    const html = await renderPage();
    const first = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
    expect(first.candidates).toEqual([
      { token: "secret-a", label: "Participante no disponible", participantNumber: "1", selected: true, missingResponse: true },
      { token: "secret-z", label: "Participante no disponible", participantNumber: "2", selected: true, missingResponse: true },
    ]);
    expect(first.publicFormUrl).toBe("https://form.typeform.com/to/form");
    expect(html).toContain("No hay respuestas disponibles");
    expect(html).not.toContain("Aún no hay participantes");
    expect(html).not.toContain("Abrir formulario"); // Lo ofrece el panel, no se duplica en el vacío.
    expect(JSON.stringify(first)).not.toMatch(/NO-MOSTRAR|TAMPOCO/);
    const table = projectedTableHtml();
    expect(table).toContain("Respuesta no disponible");
    expect(table.replace(/<[^>]*>/g, "")).not.toMatch(/secret-/);
    mocks.winners.mockResolvedValue([{ responseToken: "secret-a" }, { responseToken: "secret-z" }]);
    await renderPage();
    expect(mocks.panel.mock.calls.at(-1)![0].candidates).toEqual(first.candidates);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("añade ausentes después de las respuestas reales sin duplicar persistidos presentes ni sus números", async () => {
    mocks.responses.mockResolvedValue([{ token: "a" }, { token: "b" }]);
    mocks.winners.mockResolvedValue([{ responseToken: "b" }, { responseToken: "missing" }]);
    await renderPage();
    const projected = (mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps).candidates;
    expect(projected).toHaveLength(3);
    expect(projected.map(({ participantNumber }) => participantNumber)).toEqual(["1", "2", "3"]);
    expect(projected.filter(({ missingResponse }) => missingResponse)).toEqual([
      { token: "missing", label: "Participante no disponible", participantNumber: "3", selected: true, missingResponse: true },
    ]);
    expect(projected.find(({ token }) => token === "b")).toMatchObject({ selected: true });
  });

  it("conecta la URL pública del formulario actual al botón del panel", async () => {
    mocks.form.mockResolvedValue({ id: "actual", title: "Concurso", _links: { display: "https://example.test/to/actual" } });
    await renderPage();
    expect(mocks.panel.mock.calls[0][0].publicFormUrl).toBe("https://example.test/to/actual");
  });

  it("respeta la URL pública de la radio usando el ID del formulario, no el de la plantilla", async () => {
    mocks.access.mockResolvedValue({ user: { id: "user", globalRole: "USER" }, workspace: {
      id: "workspace", name: "Radio", role: "EDITOR", typeformId: "radio-clonada", templateFormTypeformId: LOS40_TEMPLATE_FORM_ID,
    } });
    mocks.form.mockResolvedValue({ id: "actual", title: "Concurso", _links: { display: "https://example.test/to/actual" } });
    await renderPage();
    expect(mocks.panel.mock.calls[0][0].publicFormUrl).toBe("https://concursos.los40.cl/t/?id=actual");
  });

  it("ofrece la URL pública estándar cuando Typeform no informa display ni hay integración", async () => {
    mocks.form.mockResolvedValue({ id: "form-canonico", title: "Concurso" });
    await renderPage();
    expect(mocks.panel.mock.calls[0][0].publicFormUrl).toBe("https://form.typeform.com/to/form-canonico");
  });

  it("muestra un estado vacío solo cuando no hay participantes en el conjunto completo", async () => {
    mocks.responses.mockResolvedValue([]);
    const html = await renderPage();
    expect(html).toContain("Aún no hay participantes");
    expect(html).toContain("Volver a formularios");
    expect(html).toContain('href="/workspaces/workspace/forms"');
    expect(html).not.toContain('href="/workspaces/workspace/forms/form"');
    expect(html).not.toContain('data-testid="responses-list"');
    expect(html).not.toContain("Typeform no devolvió");
    expect(mocks.panel).not.toHaveBeenCalled();
    for (const operation of [mocks.begin, mocks.readParticipant, mocks.readWinner, mocks.finish, mocks.confirm]) {
      expect(operation).not.toHaveBeenCalled();
    }
  });

  it("conecta solo las cuatro operaciones de ganadores al ámbito canónico sin ejecutarlas al renderizar", async () => {
    mocks.access.mockResolvedValue({ user: { id: "user", globalRole: "USER" }, workspace: { id: "canonical", name: "Radio", role: "EDITOR" } });
    mocks.localForm.mockResolvedValue({ id: "local", workspaceId: "canonical" });
    mocks.form.mockResolvedValue({ id: "canonical-form", title: "Concurso" });
    await renderPage({ page: "99", pageSize: "20", winnerRegionFilter: "Sur", winnerSelection: "saved", winnerError: "stale" });
    const props = mocks.panel.mock.calls[0][0] as WinnerSelectionPanelProps;
    expect(props).toMatchObject({
      currentPage: 1, itemsPerPage: 21, pageSizeValue: "all", initialRegionFilter: "Sur",
      winnerSelection: "saved", winnerError: "stale",
      exportBaseHref: "/workspaces/canonical/forms/canonical-form/responses/export",
      action: expect.any(Function), beginWinnerData: expect.any(Function),
      readWinnerData: expect.any(Function), finishWinnerData: expect.any(Function),
    });
    expect(props).not.toHaveProperty("readParticipantData");
    for (const operation of [mocks.begin, mocks.readParticipant, mocks.readWinner, mocks.finish, mocks.confirm]) {
      expect(operation).not.toHaveBeenCalled();
    }
    await props.beginWinnerData!();
    expect(mocks.begin).toHaveBeenCalledExactlyOnceWith("canonical", "canonical-form");
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.readParticipant).not.toHaveBeenCalled();
    await props.readWinnerData!("grant", "saved-token");
    expect(mocks.readWinner).toHaveBeenCalledExactlyOnceWith("canonical", "canonical-form", "grant", "saved-token");
    await props.finishWinnerData!("grant");
    expect(mocks.finish).toHaveBeenCalledExactlyOnceWith("canonical", "canonical-form", "grant");
    const snapshot = new FormData();
    snapshot.append("winnerToken", "new-token");
    await props.action(snapshot);
    expect(mocks.confirm).toHaveBeenCalledExactlyOnceWith("canonical", "canonical-form", snapshot);
    expect(mocks.begin).toHaveBeenCalledOnce();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("muestra la lista y no el vacío cuando existen respuestas", async () => {
    const html = await renderPage();
    expect(html).not.toContain('data-testid="responses-list"');
    expect(mocks.panel.mock.calls[0][0].candidates).toHaveLength(21);
    expect(html).not.toContain("Aún no hay participantes");
  });

  it("no duplica los participantes ni añade paginación aunque la URL conserve parámetros antiguos", async () => {
    const html = await renderPage({ page: "3", pageSize: "all" });
    expect(html).not.toContain('data-testid="responses-list"');
    expect(mocks.panel.mock.calls[0][0].candidates).toHaveLength(21);
    expect(mocks.panel.mock.calls[0][0].currentPage).toBe(1);
    expect(html).not.toContain("Página fuera de rango");
  });

  it("ignora una página heredada inexistente sin ocultar el selector ni inventar un concurso vacío", async () => {
    const html = await renderPage({ page: "99", pageSize: "20" });
    expect(html).not.toContain("Página fuera de rango");
    expect(mocks.panel.mock.calls[0][0].candidates).toHaveLength(21);
    expect(html).not.toContain("Aún no hay participantes");
  });

  it.each(["2abc", "2.5", "Infinity", "-1", "9007199254740992"])("una página antigua inválida %s no altera el conjunto de candidatos", async (page) => {
    expect(await renderPage({ page })).not.toContain('data-testid="responses-list"');
    expect(mocks.panel.mock.calls[0][0].candidates).toHaveLength(21);
  });

  it("recupera la página tras un fallo temporal sin conservar un estado vacío", async () => {
    mocks.responses
      .mockRejectedValueOnce(new Error("Fallo temporal"))
      .mockResolvedValueOnce([{ token: "recuperado" }]);

    await expect(renderPage()).rejects.toThrow("Fallo temporal");
    const html = await renderPage();
    expect(html).not.toContain('data-testid="responses-list"');
    expect(mocks.panel.mock.calls.at(-1)![0].candidates[0].token).toBe("recuperado");
    expect(html).not.toContain("Aún no hay participantes");
  });

  it("propaga errores de carga a la pantalla de recuperación sin inventar un vacío", async () => {
    mocks.responses.mockRejectedValue(new Error("Carga incompleta"));
    await expect(renderPage()).rejects.toThrow("Carga incompleta");
    const html = renderToStaticMarkup(<ResponsesError error={new Error("Carga incompleta")} unstable_retry={vi.fn()} />);
    expect(html).toContain("No se pudieron cargar los participantes");
    expect(html).toContain("Reintentar carga");
    expect(html).not.toContain("Aún no hay participantes");
  });
});

const privateForm = { id: "form", title: "Concurso", fields: [
  { id: "name", title: "Nombre", type: "short_text" },
  { id: "email", title: "Correo", type: "email" },
  { id: "notes", title: "Comentario", type: "long_text" },
  { id: "region", title: "Región", type: "dropdown" },
  { id: "comuna", title: "Comuna", type: "short_text" },
] };
function privateResponse(token: string) {
  return {
    token, submitted_at: "2026-11-01T12:34:56Z", landed_at: "2026-11-01T12:00:00Z",
    hidden: { secreto: `HIDDEN-${token}`, participant_number: "123456789" },
    answers: [
      { type: "text", field: { id: "name" }, text: `NOMBRE-${token}` },
      { type: "email", field: { id: "email" }, email: `${token}@private.example.test` },
      { type: "text", field: { id: "notes" }, text: `LIBRE-${token}` },
      { type: "choice", field: { id: "region" }, choice: { label: "Región Metropolitana / SECRETO-REGION" } },
      { type: "text", field: { id: "comuna" }, text: `COMUNA-${token}` },
    ],
  };
}
function clientPayload() { return JSON.stringify({ list: mocks.list.mock.calls.at(-1)?.[0], panel: mocks.panel.mock.calls.at(-1)?.[0] }); }
function projectedTableHtml() {
  const { candidates } = mocks.panel.mock.calls.at(-1)![0] as WinnerSelectionPanelProps;
  return renderToStaticMarkup(<WinnerCandidatesTable
    candidates={candidates} isPending={false} query="" selectedTokens={new Set()}
    onCandidateChange={() => {}} onQueryChange={() => {}}
  />);
}

describe("privacidad de la página con mapper real", () => {
  beforeEach(() => {
    mocks.form.mockResolvedValue(privateForm);
    mocks.responses.mockResolvedValue([privateResponse("a"), privateResponse("b")]);
  });

  it("EDITOR recibe nombre/email enmascarados y comuna real, sin región libre ni otra PII cruda", async () => {
    const html = await renderPage();
    expect(mocks.list).not.toHaveBeenCalled();
    const candidates = mocks.panel.mock.calls[0][0].candidates;
    expect(candidates).toHaveLength(2);
    for (const [index, candidate] of candidates.entries()) {
      expect(candidate.participantNumber).toBe(String(index + 1));
      expect(candidate.label).toBe("NO****");
      expect(candidate.region).toBeUndefined();
      expect(candidate.email).toBe("*****");
      expect(candidate.city).toBe(`COMUNA-${index === 0 ? "a" : "b"}`);
      expect(candidate.comuna).toBeUndefined();
      expect(candidate.selected).toBe(false);
      expect(candidate).not.toHaveProperty("answers");
      expect(candidate).not.toHaveProperty("hidden");
    }
    const payload = clientPayload();
    const tableHtml = projectedTableHtml();
    expect(tableHtml).not.toContain("NO****");
    expect(tableHtml).not.toContain("*****");
    const headers = [...tableHtml.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]*>/g, ""));
    expect(headers).toEqual(["Elegir", "Participante número", "Región", "Comuna", "Acciones"]);
    for (const city of ["COMUNA-a", "COMUNA-b"]) {
      expect(payload).toContain(city);
      expect(tableHtml).toContain(city);
    }
    for (const secret of ["NOMBRE-", "@private.example.test", "SECRETO-REGION", "LIBRE-", "HIDDEN-", "2026-11-01", "123456789"]) {
      expect(payload).not.toContain(secret);
      expect(html).not.toContain(secret);
      expect(tableHtml).not.toContain(secret);
    }
    expect(mocks.panel.mock.calls[0][0]).not.toHaveProperty("readParticipantData");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("no usa hidden como fuente de comuna, región, nombre o correo visibles", async () => {
    mocks.responses.mockResolvedValue([{ token: "hidden-only", answers: [], hidden: {
      city: "COMUNA-HIDDEN", comuna: "COMUNA-OCULTA", region: "Región de Los Ríos",
      name: "NOMBRE-HIDDEN", email: "hidden@private.example.test", phone: "TELEFONO-HIDDEN",
    } }]);
    const html = await renderPage();
    const candidate = mocks.panel.mock.calls[0][0].candidates[0];
    expect(candidate.city).toBeUndefined();
    expect(candidate.region).toBeUndefined();
    expect(candidate.email).toBeUndefined();
    expect(candidate).not.toHaveProperty("hidden");
    expect(candidate).not.toHaveProperty("answers");
    for (const secret of ["COMUNA-HIDDEN", "COMUNA-OCULTA", "Región de Los Ríos", "NOMBRE-HIDDEN", "hidden@private.example.test", "TELEFONO-HIDDEN"]) {
      expect(clientPayload()).not.toContain(secret);
      expect(html).not.toContain(secret);
      expect(projectedTableHtml()).not.toContain(secret);
    }
  });

  it("persistir A no añade respuestas ni contactos guardados o huérfanos a los perfiles", async () => {
    mocks.winners.mockResolvedValue([
      { responseToken: "a", participantEmail: "persistido-a@example.test", reason: "Sorteo" },
      { responseToken: "missing", participantEmail: "CONTACTO-HUERFANO", reason: "Sorteo" },
    ]);
    await renderPage({ page: "99" });
    expect(mocks.list).not.toHaveBeenCalled();
    const payload = clientPayload();
    expect(payload).toContain("NO****");
    expect(payload).not.toContain("NOMBRE-a");
    expect(payload).not.toContain("LIBRE-a");
    expect(payload).not.toContain("persistido-a@example.test");
    expect(payload).not.toContain("NOMBRE-b");
    expect(payload).not.toContain("LIBRE-b");
    expect(payload).not.toContain("b@private.example.test");
    expect(payload).not.toContain("CONTACTO-HUERFANO");
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.panel.mock.calls[0][0].candidates.find((candidate: { token: string }) => candidate.token === "a").selected).toBe(true);
  });

  it("una cookie fabricada no incorpora respuestas completas a la proyección autorizada", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: JSON.stringify({ by: "user", tokens: ["a", "b"] }) }) });
    await renderPage();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(clientPayload()).not.toContain("NOMBRE-");
    expect(clientPayload()).toContain("NO****");
    expect(clientPayload()).not.toContain("LIBRE-");
    expect(clientPayload()).not.toContain('"answers"');
  });

  it("retirar ganadores elimina sus datos del siguiente payload aunque la cookie aún exista", async () => {
    mocks.winners.mockResolvedValueOnce([{ responseToken: "a", participantEmail: "persistido-a@example.test", reason: "Sorteo" }]);
    await renderPage();
    expect(clientPayload()).not.toContain("LIBRE-a");
    await renderPage();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(clientPayload()).not.toContain("LIBRE-a");
    expect(clientPayload()).not.toContain("persistido-a@example.test");
  });

  it("un lector no recibe datos completos ni puede iniciar una consulta de selección", async () => {
    mocks.access.mockResolvedValue({ user: { id: "viewer", globalRole: "USER" }, workspace: { id: "workspace", name: "Radio", role: "VIEWER" } });
    mocks.membership.mockResolvedValue({ role: "VIEWER" });
    mocks.winners.mockResolvedValue([{ responseToken: "a", participantEmail: "winner@example.test", reason: "Sorteo" }]);
    const html = await renderPage();
    expect(mocks.panel).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(clientPayload()).not.toContain("NOMBRE-a");
    for (const operation of [mocks.begin, mocks.readParticipant, mocks.readWinner, mocks.finish, mocks.confirm]) {
      expect(operation).not.toHaveBeenCalled();
    }
    expect(html).toContain("Necesitas permisos de edición");
    for (const secret of ["NOMBRE-", "@private.example.test", "COMUNA-", "SECRETO-REGION", "LIBRE-", "HIDDEN-"]) {
      expect(html).not.toContain(secret);
      expect(clientPayload()).not.toContain(secret);
    }
  });

  it("SUPER_ADMIN también recibe solo perfiles enmascarados aunque su membresía sea de lectura", async () => {
    mocks.access.mockResolvedValue({ user: { id: "admin", globalRole: "SUPER_ADMIN" }, workspace: { id: "workspace", name: "Radio", role: "VIEWER" } });
    mocks.membership.mockResolvedValue({ role: "VIEWER" });
    await renderPage();
    expect(mocks.panel.mock.calls[0][0].candidates).toEqual([
      expect.objectContaining({ label: "NO****", email: "*****", city: "COMUNA-a", participantNumber: "1" }),
      expect.objectContaining({ label: "NO****", email: "*****", city: "COMUNA-b", participantNumber: "2" }),
    ]);
    expect(clientPayload()).not.toContain('"answers"');
    expect(clientPayload()).not.toContain('"hidden"');
    expect(mocks.panel.mock.calls[0][0]).toMatchObject({ beginWinnerData: expect.any(Function) });
    expect(mocks.panel.mock.calls[0][0]).not.toHaveProperty("readParticipantData");
  });

  it("enmascara campos anidados y conserva solo regiones generales reconocidas para filtros", async () => {
    mocks.form.mockResolvedValue({ id: "form", fields: [{ id: "group", type: "group", properties: { fields: [
      { id: "person", title: "Tus datos", ref: "first_name" },
      { id: "place", title: "Ubicación", ref: "region" },
      { id: "town", title: "Residencia", ref: "city" },
    ] } }] });
    mocks.responses.mockResolvedValue([{ token: "nested", answers: [
      { field: { id: "person" }, text: "Ana" },
      { field: { id: "place" }, choice: { label: "Región de Los Ríos" } },
      { field: { id: "town" }, text: "  Valdivia  " },
    ] }]);
    await renderPage();
    expect(mocks.panel.mock.calls[0][0].candidates[0]).toMatchObject({ label: "An****", region: "Región de Los Ríos", city: "Valdivia" });
    expect(clientPayload()).not.toContain("Ana");
    const tableHtml = projectedTableHtml();
    for (const visible of ["Región de Los Ríos", "Valdivia"]) expect(tableHtml).toContain(visible);
    expect(tableHtml).not.toContain("An****");
    expect(tableHtml).not.toContain("Ana");
  });

  it("proyecta contact_info y address sin serializar identidad, domicilio, teléfono ni región libre", async () => {
    mocks.responses.mockResolvedValue([{ token: "compound", answers: [
      { type: "contact_info", contact_info: { first_name: "Beatriz", last_name: "Privada", email: "beatriz@privado.test", phone_number: "TELEFONO-PRIVADO" } },
      { type: "address", address: { address_line_1: "CALLE-PRIVADA", city: "Valparaíso", state: "Los Lagos / CASA-PRIVADA", zip_code: "CODIGO-PRIVADO", country: "PAIS-PRIVADO" } },
    ], hidden: { secreto: "HIDDEN-PRIVADO" } }]);
    const html = await renderPage();
    expect(mocks.panel.mock.calls[0][0].candidates[0]).toMatchObject({ label: "Be****", email: "bea*****", city: "Valparaíso" });
    expect(mocks.panel.mock.calls[0][0].candidates[0].region).toBeUndefined();
    for (const secret of ["Beatriz", "Privada", "@privado.test", "Los Lagos", "PRIVAD"]) {
      expect(clientPayload()).not.toContain(secret);
      expect(html).not.toContain(secret);
    }
  });

  it("la consulta de membresía usa el ID local canónico y respeta el rol efectivo de BD", async () => {
    mocks.access.mockResolvedValue({ user: { id: "user", globalRole: "USER" }, workspace: { id: "canonical", name: "Radio", role: "EDITOR" } });
    mocks.localForm.mockResolvedValue({ id: "local", workspaceId: "canonical" });
    mocks.membership.mockResolvedValue({ role: "VIEWER" });
    await renderPage();
    expect(mocks.membership).toHaveBeenCalledWith({ where: { userId_workspaceId: { userId: "user", workspaceId: "canonical" } }, select: { role: true } });
    expect(mocks.panel).not.toHaveBeenCalled();
  });
});