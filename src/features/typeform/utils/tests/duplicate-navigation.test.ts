import { describe, expect, it } from "vitest";
import { getDuplicateListDestination } from "../duplicate-navigation";

const pathname = "/workspaces/workspace%20de%20prueba/forms";

function parseDestination(destination: string) {
  return new URL(destination, "https://example.test");
}

describe("getDuplicateListDestination", () => {
  it.each(["6", "12", "24", "48"])(
    "conserva pageSize=%s de la consulta actual y vuelve a la primera página",
    (pageSize) => {
      const result = parseDestination(getDuplicateListDestination(
        `${pathname}?page=9&page=10&pageSize=48`,
        `?page=7&pageSize=${pageSize}`,
      ));

      expect(result.pathname).toBe(pathname);
      expect(result.searchParams.getAll("pageSize")).toEqual([pageSize]);
      expect(result.searchParams.getAll("page")).toEqual(["1"]);
      expect([...result.searchParams.keys()].sort()).toEqual(["page", "pageSize"]);
    },
  );

  it("añade page=1 cuando no hay consultas", () => {
    expect(getDuplicateListDestination(pathname, "")).toBe(`${pathname}?page=1`);
  });

  it("admite una consulta actual sin el signo de interrogación", () => {
    const result = parseDestination(getDuplicateListDestination(pathname, "page=8&pageSize=12"));

    expect(result.searchParams.get("pageSize")).toBe("12");
    expect(result.searchParams.get("page")).toBe("1");
  });

  it("elimina todos los clonedFrom y no copia parámetros ajenos de la consulta actual", () => {
    const result = parseDestination(getDuplicateListDestination(
      `${pathname}?clonedFrom=original&clonedFrom=otra-copia`,
      "?page=8&pageSize=24&clonedFrom=actual&search=privado&sort=desc&workspaceId=otro",
    ));

    expect([...result.searchParams.entries()].sort()).toEqual([
      ["page", "1"],
      ["pageSize", "24"],
    ]);
  });

  it("conserva los parámetros del destino, incluidos repetidos y vacíos, excepto clonedFrom y page", () => {
    const result = parseDestination(getDuplicateListDestination(
      `${pathname}?search=radio+%26+m%C3%BAsica&tag=uno&tag=dos&empty=&sort=asc&page=5&clonedFrom=base`,
      "?search=no-copiar&tag=otro&sort=desc&page=9&pageSize=6",
    ));

    expect([...result.searchParams.entries()]).toEqual([
      ["search", "radio & música"],
      ["tag", "uno"],
      ["tag", "dos"],
      ["empty", ""],
      ["sort", "asc"],
      ["page", "1"],
      ["pageSize", "6"],
    ]);
  });

  it.each(["", "0", "5", "13", "96", "-6", "6.0", "06", "abc", "null", "%206%20"])(
    "ignora pageSize actual inválido (%j) sin añadirlo al destino",
    (pageSize) => {
      const result = parseDestination(getDuplicateListDestination(pathname, `?pageSize=${pageSize}`));

      expect([...result.searchParams.entries()]).toEqual([["page", "1"]]);
    },
  );

  it.each(["", "?pageSize=13", "?pageSize="])(
    "conserva pageSize del destino si el actual falta o es inválido (%j)",
    (currentQuery) => {
      const result = parseDestination(getDuplicateListDestination(
        `${pathname}?pageSize=48&page=3&clonedFrom=base`,
        currentQuery,
      ));

      expect([...result.searchParams.entries()]).toEqual([
        ["pageSize", "48"],
        ["page", "1"],
      ]);
    },
  );
});