import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTypeformFormResponses } from "../typeform.service";

const { readFile, fetchMock } = vi.hoisted(() => ({ readFile: vi.fn(), fetchMock: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", "fixture");
  vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", undefined);
  vi.stubEnv("TYPEFORM_TOKEN", "test-only-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ total_items: 1, items: [{ token: "remote-only" }] }) });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("respuestas de prueba", () => {
  it("solo lee el formulario seleccionado y mantiene remotos los demás", async () => {
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", " selected, another-selected ");
    readFile.mockResolvedValue('[{"token":"fake-only"}]');
    await expect(getTypeformFormResponses("selected")).resolves.toMatchObject({ items: [{ token: "fake-only" }] });
    expect(readFile).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/selected\.json$/), "utf8");
    expect(fetchMock).not.toHaveBeenCalled();

    for (const id of ["other", "select", "selected-extra"]) {
      await expect(getTypeformFormResponses(id, { page: 2, pageSize: 10 })).resolves.toMatchObject({ items: [{ token: "remote-only" }] });
      const [url, init] = fetchMock.mock.calls.at(-1)!;
      expect(new URL(url).pathname).toBe(`/forms/${id}/responses`);
      expect(new URL(url).searchParams.get("page")).toBe("2");
      expect(new URL(url).searchParams.get("page_size")).toBe("10");
      expect(init).toMatchObject({ cache: "no-store", headers: { Authorization: "Bearer test-only-token" } });
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(readFile).toHaveBeenCalledOnce();
  });

  it.each([undefined, "form", "other"])("nunca lee fixtures en producción con alcance %s", async (ids) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", ids);
    readFile.mockResolvedValue('[{"token":"fake-only"}]');
    await expect(getTypeformFormResponses("form")).resolves.toMatchObject({ items: [{ token: "remote-only" }] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each([undefined, "remote", "FIXTURE"])("SOURCE=%s usa fetch, no disco", async (source) => {
    vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", source);
    await expect(getTypeformFormResponses("form")).resolves.toMatchObject({ items: [{ token: "remote-only" }] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(["../private", "a/b", "a\\b", "%2e%2e", "form.json", "form\n", "a\0b"])("el ID inseguro %j nunca lee archivos", async (id) => {
    await expect(getTypeformFormResponses(id)).resolves.toMatchObject({ items: [{ token: "remote-only" }] });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(`/forms/${encodeURIComponent(id)}/responses?`), expect.any(Object),
    );
    expect(readFile).not.toHaveBeenCalled();
  });

  it("no confunde un archivo inexistente con un formulario sin participantes", async () => {
    readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    await expect(getTypeformFormResponses("form")).rejects.toThrow("No se encontró el archivo");
  });

  it.each(["{}", "null", '{"items":null}', '{"items":{}}'])("rechaza la estructura inválida %s", async (fixture) => {
    readFile.mockResolvedValue(fixture);
    await expect(getTypeformFormResponses("form")).rejects.toThrow("formato inválido");
  });

  it.each(["[]", '{"items":[]}'])("acepta un fixture explícitamente vacío %s", async (fixture) => {
    readFile.mockResolvedValue(fixture);
    await expect(getTypeformFormResponses("form")).resolves.toMatchObject({ total_items: 0, items: [] });
  });

  it("pagina un fixture válido por cursor", async () => {
    readFile.mockResolvedValue(JSON.stringify([{ token: "a" }, { token: "b" }]));
    await expect(getTypeformFormResponses("form", { pageSize: 1, before: "a" }))
      .resolves.toMatchObject({ total_items: 2, items: [{ token: "b" }] });
  });
});