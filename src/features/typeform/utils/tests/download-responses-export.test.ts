import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadResponsesExport } from "../download-responses-export";

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const fetchMock = vi.fn();
const link = { href: "", download: "", hidden: false, click: vi.fn(), remove: vi.fn() };
const appendChild = vi.fn();

function fileResponse(body = "xlsx-content", filename?: string) {
  return new Response(body, {
    headers: {
      "Content-Type": MIME,
      ...(filename ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", {
    location: { href: "https://app.example/workspaces/radio/forms/form/responses", origin: "https://app.example" },
  });
  vi.stubGlobal("document", { createElement: vi.fn(() => link), body: { appendChild } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadResponsesExport", () => {
  it("preserva parámetros, reemplaza scope/format y descarga el nombre del servidor", async () => {
    fetchMock.mockResolvedValue(fileResponse("xlsx-content", "ganadores-form.xlsx"));

    await downloadResponsesExport("/export?filter=all&scope=participants&format=csv#tabla", "winners");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example/export?filter=all&scope=winners&format=xlsx",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
    expect(link.download).toBe("ganadores-form.xlsx");
    expect(link.href).toBe("blob:export");
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });

  it("el permiso temporal viaja en una cabecera, nunca en la URL", async () => {
    fetchMock.mockResolvedValue(fileResponse());
    const controller = new AbortController();
    await downloadResponsesExport("/export", "winners", { winnerFlowToken: "CAPACIDAD-PRIVADA", signal: controller.signal });
    expect(fetchMock.mock.calls[0][0]).not.toContain("CAPACIDAD-PRIVADA");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { "X-Winner-Flow": "CAPACIDAD-PRIVADA" }, signal: controller.signal });
  });

  it("cerrar la consulta durante la descarga impide crear el archivo", async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue({ status: 200, ok: true, redirected: false, headers: new Headers({ "Content-Type": MIME }),
      blob: async () => { controller.abort(); return new Blob(["archivo"]); },
    });
    await expect(downloadResponsesExport("/export", "winners", { winnerFlowToken: "flow", signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(link.click).not.toHaveBeenCalled();
  });

  it.each([ ["participants", "participantes.xlsx"], ["winners", "ganadores.xlsx"] ] as const)(
    "usa un nombre de respaldo para %s", async (scope, filename) => {
      fetchMock.mockResolvedValue(fileResponse());
      await downloadResponsesExport("/export", scope);
      expect(link.download).toBe(filename);
    },
  );

  it.each([400, 403, 404, 500])("comunica el mensaje JSON del error HTTP %s sin descargar", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ message: "No se puede exportar." }, { status }));
    await expect(downloadResponsesExport("/export", "winners")).rejects.toThrow("No se puede exportar.");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(link.click).not.toHaveBeenCalled();
  });

  it("tolera respuestas de error no JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Bad Gateway", { status: 502 }));
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("No se pudo descargar");
  });

  it("detecta una sesión caducada", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("Tu sesión ha caducado");
  });

  it("rechaza la redirección al login sin descargar su HTML", async () => {
    const response = new Response("login", { headers: { "Content-Type": "text/html" } });
    Object.defineProperty(response, "redirected", { value: true });
    fetchMock.mockResolvedValue(response);
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("Tu sesión ha caducado");
    expect(link.click).not.toHaveBeenCalled();
  });

  it("no descarga respuestas exitosas con un contenido inesperado", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "no es un archivo" }));
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("No se pudo descargar");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rechaza un archivo vacío", async () => {
    fetchMock.mockResolvedValue(fileResponse(""));
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("está vacío");
  });

  it("rechaza URLs externas antes de enviar la petición", async () => {
    await expect(downloadResponsesExport("https://otro.example/export", "participants")).rejects.toThrow("no es válida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propaga los errores de red sin intentar descargar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("Failed to fetch");
    expect(link.click).not.toHaveBeenCalled();
  });

  it("libera el recurso incluso si falla el clic de descarga", async () => {
    fetchMock.mockResolvedValue(fileResponse());
    link.click.mockImplementationOnce(() => { throw new Error("Descarga bloqueada"); });
    await expect(downloadResponsesExport("/export", "participants")).rejects.toThrow("Descarga bloqueada");
    expect(link.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });
});