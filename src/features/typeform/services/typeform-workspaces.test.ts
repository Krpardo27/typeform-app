import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
let service: typeof import("./typeform.service");
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }); }
function workspace(id: string) { return { id, name: `Radio ${id}`, self: { href: `https://typeform.test/workspaces/${id}` } }; }

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("Petición inesperada"));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TYPEFORM_TOKEN", "test-token");
  vi.stubEnv("TYPEFORM_API_BASE_URL", "https://typeform.test");
  service = await import("./typeform.service");
});
afterEach(() => {
  for (const [, init] of fetchMock.mock.calls) {
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.cache).toBe("no-store");
  }
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("catálogo completo de workspaces Typeform", () => {
  it("incluye workspaces después de los primeros 200 y obtiene cada página una sola vez", async () => {
    const first = Array.from({ length: 200 }, (_, index) => workspace(`id-${index}`));
    const last = workspace("id-200");
    fetchMock
      .mockResolvedValueOnce(json({ total_items: 201, page_count: 2, items: first }))
      .mockResolvedValueOnce(json({ total_items: 201, page_count: 2, items: [last] }));
    expect(await service.getAllTypeformWorkspaces()).toEqual([...first, last]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, lastUrl] = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(firstUrl.searchParams.get("page_size")).toBe("200");
    expect(lastUrl.searchParams.get("page")).toBe("2");
  });

  it("una página corta no se interpreta como el final del catálogo", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("a")] }))
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("b")] }));
    expect(await service.getAllTypeformWorkspaces()).toHaveLength(2);
  });

  it.each([0, 1])("acepta un catálogo vacío únicamente si el total es cero (page_count=%i)", async (page_count) => {
    fetchMock.mockResolvedValueOnce(json({ total_items: 0, page_count, items: [] }));
    expect(await service.getAllTypeformWorkspaces()).toEqual([]);
  });

  it.each([401, 403, 404, 429, 500, 503])("no convierte el error HTTP %i del catálogo en una eliminación", async (status) => {
    fetchMock.mockResolvedValueOnce(json({}, status));
    await expect(service.getAllTypeformWorkspaces()).rejects.toThrow(`Typeform API error ${status}`);
  });

  it("no entrega un catálogo parcial si falla una página posterior", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("a")] }))
      .mockRejectedValueOnce(new Error("Conexión interrumpida"));
    await expect(service.getAllTypeformWorkspaces()).rejects.toThrow("Conexión interrumpida");
  });

  it.each([
    null, {}, { total_items: -1, page_count: 1, items: [] },
    { total_items: 1, page_count: 0, items: [workspace("a")] },
    { total_items: 1, page_count: 1, items: [] },
    { total_items: 1, page_count: 1.5, items: [workspace("a")] },
    { total_items: 0, page_count: 1, items: [workspace("a")] },
    { total_items: 2, page_count: 1, items: [workspace("a")] },
    { total_items: 1, page_count: 1, items: [null] },
    { total_items: 1, page_count: 1, items: [{ id: " " }] },
    { total_items: 1, page_count: 1, items: [{ id: " a " }] },
    { total_items: 1, page_count: 1, items: [{ id: 1 }] },
  ])("rechaza respuestas inválidas o incompletas: %j", async (body) => {
    fetchMock.mockResolvedValueOnce(json(body));
    await expect(service.getAllTypeformWorkspaces()).rejects.toThrow();
  });

  it("rechaza duplicados entre páginas en lugar de inferir workspaces ausentes", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("a")] }))
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("a")] }));
    await expect(service.getAllTypeformWorkspaces()).rejects.toThrow(/repetidos/);
  });

  it("rechaza un total que cambia durante la lectura", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ total_items: 2, page_count: 2, items: [workspace("a")] }))
      .mockResolvedValueOnce(json({ total_items: 1, page_count: 1, items: [workspace("b")] }));
    await expect(service.getAllTypeformWorkspaces()).rejects.toThrow(/cambió/);
  });

  it.each([0, -1, 1.5, NaN, Infinity])("rechaza un número de página inválido %s antes de consultar", async (page) => {
    await expect(service.getTypeformWorkspaces({ page })).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});