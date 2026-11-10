import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real service with a fully stubbed transport. No DB imports.
const fetchMock = vi.fn<typeof fetch>();
let service: typeof import("../../services/typeform.service");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("Unexpected API call"));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TYPEFORM_TOKEN", "test-token");
  vi.stubEnv("TYPEFORM_API_BASE_URL", "https://typeform.test");
  service = await import("../../services/typeform.service");
});

afterEach(() => {
  for (const [, init] of fetchMock.mock.calls) {
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.cache).toBe("no-store");
    expect(init).not.toHaveProperty("next");
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("findWorkspaceFormsByTitle provider integration", () => {
  it("resolves the canonical workspace and returns ALL normalized matches across ALL pages", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = Array.from({ length: 200 }, (_, i) => ({
      id: `first-${i}`, title: "  OPINIÓN\t ANUAL  ",
    }));
    const second = Array.from({ length: 200 }, (_, i) => ({
      id: `second-${i}`, title: "ＯＰＩＮＩＯ\u0301Ｎ\u00a0ＡＮＵＡＬ",
    }));
    const last = { id: "source-id", title: "Opinio\u0301n\nAnual" };
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ items: [{ id: "canonical-id", name: "Workspace Alias" }] }))
      .mockResolvedValueOnce(json({ page_count: 3, total_items: 404, items: first }))
      .mockResolvedValueOnce(json({ page_count: 3, total_items: 404, items: second }))
      .mockResolvedValueOnce(json({ page_count: 3, total_items: 404, items: [
        last,
        { id: "no-accent", title: "Opinion anual" },
        { id: "different", title: "Opinión mensual" },
        { id: "not-exact", title: "Opinión anual copia" },
      ] }));

    expect(await service.findWorkspaceFormsByTitle("Workspace Alias", " opinión   anual "))
      .toEqual([...first, ...second, last]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    for (const [index, [input]] of fetchMock.mock.calls.slice(2).entries()) {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/forms");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        workspace_id: "canonical-id", page_size: "200", page: String(index + 1),
      });
    }
  });

  it("visits later pages even when an earlier page has no matches", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({ page_count: 2, items: [{ id: "other", title: "Otro" }] }))
      .mockResolvedValueOnce(json({ page_count: 2, items: [{ id: "match", title: "ENCUESTA" }] }));
    expect(await service.findWorkspaceFormsByTitle("workspace-id", "Encuesta"))
      .toEqual([{ id: "match", title: "ENCUESTA" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns empty only after a successful listing without matches", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({ page_count: 1, items: [{ id: "other", title: "Opinion" }] }));
    expect(await service.findWorkspaceFormsByTitle("workspace-id", "Opinión")).toEqual([]);
  });

  it.each([404, 429, 500])("propagates listing HTTP %i instead of pretending no conflicts exist", async (status) => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({}, status));
    await expect(service.findWorkspaceFormsByTitle("workspace-id", "Copia"))
      .rejects.toThrow(`Typeform API error ${status}`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not return incomplete matches if a later page fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({ page_count: 2, items: [{ id: "match", title: "Copia" }] }))
      .mockRejectedValueOnce(new Error("Network unavailable"));
    await expect(service.findWorkspaceFormsByTitle("workspace-id", "Copia"))
      .rejects.toThrow("Network unavailable");
  });

  it("propagates workspace resolution failures before listing", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503));
    await expect(service.findWorkspaceFormsByTitle("workspace-id", "Copia"))
      .rejects.toThrow("Typeform API error 503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid pagination rather than returning a false successful check", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({ items: [] }));
    await expect(service.findWorkspaceFormsByTitle("workspace-id", "Copia"))
      .rejects.toThrow(/paginación.*inválida/);
  });

  it("preserves the real source membership check before any POST", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: "workspace-id" }))
      .mockResolvedValueOnce(json({ id: "foreign", title: "Copia", workspace: {
        href: "https://typeform.test/workspaces/foreign-workspace",
      } }));
    expect(await service.duplicateTypeformForm({
      formId: "foreign", workspaceTypeformId: "workspace-id", title: "Copia",
    })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});