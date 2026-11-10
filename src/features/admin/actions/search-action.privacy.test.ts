import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), visible: vi.fn(), authorized: vi.fn(), allowed: vi.fn(), formRecord: vi.fn(), winners: vi.fn(),
  form: vi.fn(), responses: vi.fn(), belongs: vi.fn(), cookies: vi.fn(),
}));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/features/admin/workspaces/services/workspace-permissions", () => ({ getVisibleWorkspaces: mocks.visible, getAuthorizedWorkspace: mocks.authorized }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  allowedUser: { findMany: mocks.allowed }, form: { findUnique: mocks.formRecord }, formWinner: { findMany: mocks.winners },
} }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/features/typeform/services/typeform.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/typeform/services/typeform.service")>(),
  getTypeformForm: mocks.form, getTypeformFormResponses: mocks.responses,
  formBelongsToWorkspace: mocks.belongs, resolveWorkspaceTypeformId: async () => "remote-workspace",
}));

import { searchGlobalAction } from "./search-action";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user", name: "Admin", email: "admin@example.test", globalRole: "SUPER_ADMIN" });
  mocks.visible.mockResolvedValue([]);
  mocks.authorized.mockResolvedValue({ id: "workspace", typeformId: "remote-workspace", role: "EDITOR" });
  mocks.allowed.mockResolvedValue([]);
  mocks.formRecord.mockResolvedValue({ id: "local", workspaceId: "workspace" });
  mocks.winners.mockResolvedValue([{ responseToken: "token-a" }]);
  mocks.form.mockResolvedValue({ id: "form", title: "Concurso", fields: [{ id: "name", title: "Nombre", type: "short_text" }] });
  mocks.belongs.mockReturnValue(true);
  mocks.responses.mockResolvedValue({ total_items: 2, items: [
    { token: "token-a", answers: [{ type: "text", field: { id: "name" }, text: "PRIVADO-GANADOR" }] },
    { token: "token-b", answers: [{ type: "text", field: { id: "name" }, text: "PRIVADO-PARTICIPANTE" }] },
  ] });
  mocks.cookies.mockResolvedValue({ get: () => ({ value: JSON.stringify({ by: "user", tokens: ["token-a", "token-b"] }) }) });
});
function search(query: string) { return searchGlobalAction(query, { workspaceId: "workspace", formId: "form", includeParticipants: true }); }

describe("el buscador no sustituye al flujo de consulta sensible", () => {
  it.each(["PRIVADO-GANADOR", "PRIVADO-PARTICIPANTE"])("no indexa ni revela datos completos al buscar %s", async (query) => {
    expect((await search(query)).participants).toEqual([]);
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("un ganador guardado solo aparece con referencia anónima", async () => {
    const result = await search("ganador");
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0]).toMatchObject({ token: "token-a", label: "Participante 1", isWinner: true });
    expect(JSON.stringify(result.participants)).not.toContain("PRIVADO-");
  });

  it("una cookie antigua no resucita una selección retirada", async () => {
    mocks.winners.mockResolvedValueOnce([]);
    expect((await search("ganador")).participants).toEqual([]);
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("no consulta respuestas de un formulario ajeno al workspace", async () => {
    mocks.belongs.mockReturnValueOnce(false);
    expect((await search("participante")).participants).toEqual([]);
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it("también comprueba la propiedad local antes de buscar participantes", async () => {
    mocks.formRecord.mockResolvedValueOnce({ id: "local", workspaceId: "foreign" });
    expect((await search("participante")).participants).toEqual([]);
    expect(mocks.responses).not.toHaveBeenCalled();
  });
});