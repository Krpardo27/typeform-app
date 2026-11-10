import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import type { WinnerCandidate } from "./types";

const sorting = vi.hoisted(() => ({ value: null as { id: string; desc: boolean } | null }));

// Conserva solo el estado de orden de columna entre renders SSR para ejecutar
// los handlers reales. Los hooks y el modelo de filas de TanStack siguen reales.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      if (initial !== null) return actual.useState(initial);
      return [sorting.value, (next: typeof sorting.value | ((previous: typeof sorting.value) => typeof sorting.value)) => {
        sorting.value = typeof next === "function" ? next(sorting.value) : next;
      }];
    },
  };
});

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

beforeEach(() => { sorting.value = null; });

function renderRows(candidates: WinnerCandidate[], selectedTokens = new Set<string>(), isPending = false) {
  const props: ComponentProps<typeof WinnerCandidatesTable> = {
    candidates, selectedTokens, isPending, query: "",
    onCandidateChange: () => {}, onQueryChange: () => {},
  };
  let elements: ReactElement<Record<string, unknown>>[] = [];
  function CaptureTable() {
    const element = WinnerCandidatesTable(props);
    elements = nodes(element);
    return element;
  }
  const html = renderToStaticMarkup(<CaptureTable />);
  const rows = html.match(/<tbody>(.*?)<\/tbody>/)?.[1].match(/<tr\b[^>]*>.*?<\/tr>/g) ?? [];
  const headers = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]*>/g, ""));
  return {
    html, rows, headers,
    headerElements: elements.filter((element) => element.type === "th"),
    orderDescription: elements.find((element) => element.type === "p" && element.props.id),
    numbers: rows.map((row) => {
      const referenceCell = [...row.matchAll(/<td\b[^>]*>(.*?)<\/td>/g)][1]?.[1] ?? "";
      return Number(referenceCell.replace(/<[^>]*>/g, "").match(/^#(\d+)/)?.[1]);
    }),
    badges: rows.map((row) => row.includes("Ganador guardado")),
    sortButtons: elements.filter((element) => element.type === "button" && String(element.props["aria-label"]).startsWith("Ordenar por ")),
    clickSort: (label: string) => {
      const button = elements.find((element) => element.type === "button" && String(element.props["aria-label"]).startsWith(`Ordenar por ${label}.`));
      expect(button).toBeDefined();
      (button!.props.onClick as () => void)();
    },
  };
}

function expectSortSemantics(view: ReturnType<typeof renderRows>, label?: string, direction?: "ascendente" | "descendente") {
  const activeHeaders = view.headerElements.filter((header) => header.props["aria-sort"] !== undefined);
  expect(activeHeaders).toHaveLength(label ? 1 : 0);
  for (const header of activeHeaders) {
    expect(header.props["aria-sort"]).toBe("other");
    expect(nodes(header).some((node) => node.type === "button" &&
      node.props["aria-label"] === `Ordenar por ${label}. Orden ${direction}`)).toBe(true);
  }
  expect(view.html).not.toMatch(/aria-sort="(?:ascending|descending|none)"/);
  const description = view.orderDescription!;
  expect(description.props.className).not.toContain("sr-only");
  expect(description.props.children).toBe(label
    ? `Ganadores guardados primero. ${label} en orden ${direction} dentro de cada grupo.`
    : "Ganadores guardados primero. Sin orden de columna se conserva el orden original dentro de cada grupo.");
  for (const button of view.sortButtons) {
    expect(button.props["aria-describedby"]).toBe(description.props.id);
  }
}

const candidates: WinnerCandidate[] = [
  { token: "a", label: "An****", participantNumber: 2 },
  { token: "b", label: "Be****", participantNumber: 30, selected: true },
  { token: "c", label: "Ca****", participantNumber: 1 },
  { token: "d", label: "Da****", participantNumber: 10, selected: true },
];

describe("orden visual de ganadores con TanStack", () => {
  it("pone guardados primero y conserva el orden de entrada dentro de cada grupo", () => {
    const view = renderRows(candidates);
    expect(view.headers).toEqual(["Elegir", "Participante número", "Región", "Comuna", "Acciones"]);
    expect(view.sortButtons.map((button) => button.props["aria-label"])).toEqual([
      "Ordenar por Participante número. Sin orden", "Ordenar por Región. Sin orden", "Ordenar por Comuna. Sin orden",
    ]);
    expect(view.numbers).toEqual([30, 10, 2, 1]);
    expect(view.badges).toEqual([true, true, false, false]);
    expectSortSemantics(view);
  });

  it("las casillas del borrador no cambian el orden ni acreditan ganadores", () => {
    const view = renderRows(candidates, new Set(["a", "c"]));
    expect(view.numbers).toEqual([30, 10, 2, 1]);
    expect(view.badges).toEqual([true, true, false, false]);
    expect(view.rows.slice(0, 2).every((row) => !row.includes('checked=""'))).toBe(true);
    expect(view.rows.slice(2).every((row) => row.includes('checked=""'))).toBe(true);
  });

  it("sin ganadores conserva la numeración y el orden original, sin ordenar por número", () => {
    const view = renderRows(candidates.map((candidate) => ({ ...candidate, selected: false })));
    expect(view.numbers).toEqual([2, 30, 1, 10]);
    expect(view.badges.every((saved) => !saved)).toBe(true);
  });

  it("reordena la proyección confirmada sin mutar los datos del sorteo ni las referencias", () => {
    const input = candidates.map((candidate) => Object.freeze({ ...candidate, selected: false }));
    Object.freeze(input);
    expect(renderRows(input).numbers).toEqual([2, 30, 1, 10]);
    const confirmed = input.map((candidate) => ({ ...candidate, selected: candidate.token === "c" || candidate.token === "d" }));
    expect(renderRows(confirmed).numbers).toEqual([1, 10, 2, 30]);
    expect(input.map(({ token }) => token)).toEqual(["a", "b", "c", "d"]);
    expect(input.every(({ selected }) => !selected)).toBe(true);
  });

  it("prioriza ganadores al final de una lista grande, sin renumerarlos ni revelar identidad", () => {
    const input = Array.from({ length: 250 }, (_, index) => ({
      token: `synthetic-${index + 1}`, label: "Pa****", participantNumber: index + 1,
      email: "par*****", selected: index === 198 || index === 249,
    }));
    const view = renderRows(input);
    expect(view.numbers.slice(0, 4)).toEqual([199, 250, 1, 2]);
    expect(view.numbers).toHaveLength(250);
    expect(new Set(view.numbers).size).toBe(250);
    expect(view.badges.filter(Boolean)).toHaveLength(2);
    for (const value of ["Pa****", "par*****"]) expect(view.html).not.toContain(value);
    expect(input.every(({ label, email }) => label === "Pa****" && email === "par*****")).toBe(true);
    for (const [direction, firstNumbers] of [
      ["ascendente", [199, 250, 1, 2]],
      ["descendente", [250, 199, 249, 248]],
      [undefined, [199, 250, 1, 2]],
    ] as const) {
      view.clickSort("Participante número");
      const sorted = renderRows(input);
      expect(sorted.numbers.slice(0, 4)).toEqual(firstNumbers);
      expect(sorted.numbers).toHaveLength(250);
      expect(new Set(sorted.numbers).size).toBe(250);
      expect(sorted.badges.filter(Boolean)).toHaveLength(2);
      expectSortSemantics(sorted, direction ? "Participante número" : undefined, direction);
      for (const value of ["Pa****", "par*****", "Nombre privado", "privado@example.test"]) expect(sorted.html).not.toContain(value);
    }
  });

  it.each([
    ["Participante número", [10, 30, 1, 2], [30, 10, 2, 1]],
    ["Región", [10, 30, 1, 2], [30, 10, 2, 1]],
    ["Comuna", [30, 10, 2, 1], [10, 30, 1, 2]],
  ] as const)("%s alterna ascendente, descendente y sin orden sin desplazar ganadores", (label, ascending, descending) => {
    const input = candidates.map((candidate, index) => ({
      ...candidate,
      region: ["Sur", "Sur", "Norte", "Norte"][index],
      city: ["Antofagasta", "Antofagasta", "Valdivia", "Valdivia"][index],
      email: "pri*****",
    }));
    const original = structuredClone(input);
    let view = renderRows(input, new Set(["a", "c"]));
    for (const [numbers, direction, accessibleDirection] of [
      [ascending, "ascendente", "Orden ascendente"],
      [descending, "descendente", "Orden descendente"],
      [[30, 10, 2, 1], undefined, "Sin orden"],
    ] as const) {
      view.clickSort(label);
      view = renderRows(input, new Set(["a", "c"]));
      expect(view.numbers).toEqual(numbers);
      expect(view.badges).toEqual([true, true, false, false]);
      expectSortSemantics(view, direction ? label : undefined, direction);
      expect(view.sortButtons.find((button) => button.props["aria-label"] === `Ordenar por ${label}. ${accessibleDirection}`)).toBeDefined();
      expect(view.rows.slice(0, 2).every((row) => !row.includes('checked=""'))).toBe(true);
      expect(view.rows.slice(2).every((row) => row.includes('checked=""'))).toBe(true);
      for (const candidate of input) {
        expect(view.html).not.toContain(candidate.label);
        expect(view.html).not.toContain(candidate.email);
      }
    }
    expect(input).toEqual(original);
  });

  it.each(["Participante número", "Región", "Comuna"])("%s deja los valores ausentes al final de cada grupo en ASC y DESC", (label) => {
    // Las comunas alternativas deben ser el mismo valor visible y ordenable:
    // city vacía/blanca no puede ocultar comuna ni convertirse en un ausente.
    const input: WinnerCandidate[] = [true, false].flatMap((selected) => [
      { token: `${selected}-missing`, label: "Oc****", selected, city: "   ", comuna: "  ", region: "   " },
      { token: `${selected}-z`, label: "Oc****", selected, participantNumber: 10, city: "", comuna: "  Valdivia  ", region: "  Sur  " },
      { token: `${selected}-a`, label: "Oc****", selected, participantNumber: 2, city: "   ", comuna: "  Antofagasta  ", region: " Norte " },
    ]);
    const original = structuredClone(input);
    let view = renderRows(input);
    for (const [direction, suffixes] of [
      ["ascendente", ["a", "z", "missing"]],
      ["descendente", ["z", "a", "missing"]],
    ] as const) {
      view.clickSort(label);
      view = renderRows(input);
      const expectedTokens = [true, false].flatMap((selected) => suffixes.map((suffix) => `${selected}-${suffix}`));
      expect(view.rows.map((row) => row.match(/name="winnerToken"[^>]*value="([^"]+)"/)?.[1])).toEqual(expectedTokens);
      expect(view.badges).toEqual([true, true, true, false, false, false]);
      expect(view.rows.map((row) => [...row.matchAll(/<td\b[^>]*>(.*?)<\/td>/g)][3][1])).toEqual(
        [true, false].flatMap(() => suffixes.map((suffix) => suffix === "missing" ? "-" : suffix === "a" ? "Antofagasta" : "Valdivia")),
      );
      expectSortSemantics(view, label, direction);
    }
    expect(input).toEqual(original);
  });

  it.each(["selected", "actions", "__proto__", "unknown"])("ignora un estado de columna no permitido: %s", (id) => {
    sorting.value = { id, desc: true };
    const view = renderRows(candidates);
    expect(view.numbers).toEqual([30, 10, 2, 1]);
    expect(view.sortButtons).toHaveLength(3);
    expectSortSemantics(view);
  });

  it("cambiar de cabecera reinicia ascendente y durante guardado no cambia el orden", () => {
    const view = renderRows(candidates);
    view.clickSort("Participante número");
    renderRows(candidates).clickSort("Participante número");
    expect(renderRows(candidates).numbers).toEqual([30, 10, 2, 1]);
    renderRows(candidates).clickSort("Región");
    const switched = renderRows(candidates);
    expect(switched.sortButtons[0].props["aria-label"]).toBe("Ordenar por Participante número. Sin orden");
    expect(switched.sortButtons[1].props["aria-label"]).toBe("Ordenar por Región. Orden ascendente");
    expectSortSemantics(switched, "Región", "ascendente");
    const pending = renderRows(candidates, new Set(), true);
    expect(pending.sortButtons).toHaveLength(3);
    expect(pending.sortButtons.every((button) => button.props.disabled)).toBe(true);
    pending.clickSort("Comuna");
    expect(renderRows(candidates).sortButtons.map((button) => button.props["aria-label"])).toEqual(
      switched.sortButtons.map((button) => button.props["aria-label"]),
    );
  });
});