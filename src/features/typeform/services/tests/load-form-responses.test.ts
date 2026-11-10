import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFormResponses } from "../load-form-responses";

const { getResponses } = vi.hoisted(() => ({ getResponses: vi.fn() }));
vi.mock("../typeform.service", () => ({ getTypeformFormResponses: getResponses }));

beforeEach(() => vi.resetAllMocks());

describe("loadFormResponses", () => {
  it("solo devuelve vacío cuando el total y los items confirman que no hay respuestas", async () => {
    getResponses.mockResolvedValue({ total_items: 0, items: [] });
    await expect(loadFormResponses("form")).resolves.toEqual([]);
    expect(getResponses).toHaveBeenCalledOnce();
  });

  it("rechaza una primera página vacía con total positivo", async () => {
    getResponses.mockResolvedValue({ total_items: 120, items: [] });
    await expect(loadFormResponses("form")).rejects.toThrow("No se pudieron cargar todas");
  });

  it("continúa tras páginas cortas si quedan respuestas por recuperar", async () => {
    getResponses
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "a" }] })
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "b" }, { token: "c" }] });
    await expect(loadFormResponses("form")).resolves.toEqual([{ token: "a" }, { token: "b" }, { token: "c" }]);
    expect(getResponses).toHaveBeenNthCalledWith(2, "form", { pageSize: 100, before: "a" });
  });

  it("cuenta tokens únicos y no páginas solapadas para comprobar completitud", async () => {
    getResponses
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "a" }, { token: "b" }] })
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "b" }, { token: "c" }] });
    const responses = await loadFormResponses("form");
    expect(responses.map((response) => response.token)).toEqual(["a", "b", "c"]);
  });

  it("no presenta un subconjunto como carga completa cuando una página siguiente está vacía", async () => {
    getResponses
      .mockResolvedValueOnce({ total_items: 3, items: [{ token: "a" }] })
      .mockResolvedValueOnce({ total_items: 3, items: [] });
    await expect(loadFormResponses("form")).rejects.toThrow("No se pudieron cargar todas");
  });

  it("interrumpe cursores repetidos sin entrar en bucle", async () => {
    getResponses.mockResolvedValue({ total_items: 3, items: [{ token: "a" }] });
    await expect(loadFormResponses("form")).rejects.toThrow("No se pudieron cargar todas");
    expect(getResponses).toHaveBeenCalledTimes(2);
  });

  it.each([
    { total_items: -1, items: [] },
    { total_items: NaN, items: [] },
    { total_items: 1.5, items: [] },
    { total_items: 1, items: null },
    { total_items: 0, items: [{ token: "a" }] },
    { total_items: 1, items: [{ token: "" }] },
  ])("rechaza metadatos o respuestas inconsistentes: %j", async (page) => {
    getResponses.mockResolvedValue(page);
    await expect(loadFormResponses("form")).rejects.toThrow("No se pudieron cargar todas");
  });

  it("propaga fallos de la API en lugar de convertirlos en vacío", async () => {
    getResponses.mockRejectedValue(new Error("Typeform no disponible"));
    await expect(loadFormResponses("form")).rejects.toThrow("Typeform no disponible");
  });
});