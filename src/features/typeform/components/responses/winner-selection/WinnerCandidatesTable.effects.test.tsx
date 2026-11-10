import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import type { WinnerCandidate } from "./types";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as Array<{ value?: unknown; deps?: readonly unknown[] }>,
  effects: [] as Array<() => void>,
}));

// Harness node: estado y refs persistentes, commit de la ref ANTES de efectos.
// No simula layout, scroll del navegador, StrictMode ni el scheduler de React.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useId: () => "effects-table",
  useRef: (initial: unknown) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: { current: initial } };
    return slot.value;
  },
  useState: <T,>(initial: T) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: initial };
    return [slot.value, (next: T | ((previous: T) => T)) => {
      slot.value = typeof next === "function" ? (next as (previous: T) => T)(slot.value as T) : next;
    }];
  },
  useEffect: (effect: () => void, deps: readonly unknown[]) => {
    const slot = hooks.slots[hooks.cursor++] ??= {};
    if (!slot.deps || slot.deps.length !== deps.length || deps.some((value, index) => !Object.is(value, slot.deps![index]))) {
      hooks.effects.push(effect);
      slot.deps = [...deps];
    }
  },
}));

// Solo sustituye useTable para no mezclar hooks internos con el harness.
// No reproduce su comparador/modelo: la suite sorting usa TanStack real.
vi.mock("@tanstack/react-table", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-table")>(),
  useTable: ({ state }: { state: { sorting: Array<{ id: string; desc: boolean }> } }) => ({
    getHeaderGroups: () => [{
      id: "headers",
      headers: ["selected", "detail", "region", "city", "actions"].map((id) => ({
        id, isPlaceholder: false,
        column: {
          id,
          getCanSort: () => true,
          getIsSorted: () => {
            const sort = state.sorting.find((entry) => entry.id === id);
            return sort ? (sort.desc ? "desc" : "asc") : false;
          },
        },
      })),
    }],
    getRowModel: () => ({ rows: [] }),
    FlexRender: () => null,
  }),
}));

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

type Props = ComponentProps<typeof WinnerCandidatesTable>;
const candidates: WinnerCandidate[] = [
  { token: "saved", label: "Oc****", participantNumber: 1, selected: true, region: "Norte" },
  { token: "draft", label: "Oc****", participantNumber: 2, region: "Sur" },
];
const props: Props = {
  candidates, confirmedSelectionKey: JSON.stringify(["saved"]),
  isPending: false, query: "", selectedTokens: new Set(["saved"]),
  onCandidateChange: () => {}, onQueryChange: () => {},
};

function mountTable() {
  let position = 0;
  const writeScroll = vi.fn<(value: number) => void>();
  const listNode = {
    get scrollTop() { return position; },
    set scrollTop(value: number) { position = value; writeScroll(value); },
  };
  let committedRef: unknown;
  function render(overrides: Partial<Props> = {}) {
    hooks.cursor = 0;
    const elements = nodes(WinnerCandidatesTable({ ...props, ...overrides }));
    const region = elements.find((element) => element.props.role === "region")!;
    const ref = region.props.ref as { current: unknown };
    if (committedRef) expect(ref).toBe(committedRef);
    committedRef = ref;
    // El mismo nodo sobrevive a todos los rerenders, incluso con cero resultados.
    ref.current = listNode;
    hooks.effects.splice(0).forEach((effect) => effect());
    return {
      clickSort: (label: string) => {
        const button = elements.find((element) => element.type === "button" && String(element.props["aria-label"]).startsWith(`Ordenar por ${label}.`));
        expect(button).toBeDefined();
        (button!.props.onClick as () => void)();
      },
    };
  }
  function scrollDown() {
    listNode.scrollTop = 480;
    writeScroll.mockClear();
  }
  function expectReset() {
    expect(listNode.scrollTop).toBe(0);
    expect(writeScroll).toHaveBeenCalledExactlyOnceWith(0);
  }
  function expectPreserved() {
    expect(listNode.scrollTop).toBe(480);
    expect(writeScroll).not.toHaveBeenCalled();
  }
  return { render, scrollDown, expectReset, expectPreserved };
}

beforeEach(() => {
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.effects = [];
});

describe("scroll de tabla ligado a selección confirmada y orden, no a filtros o borrador", () => {
  it("ocultar ganadores por filtros y editar el borrador conserva scroll con la misma clave completa", () => {
    const table = mountTable();
    table.render();
    table.expectReset();
    table.scrollDown();
    const filtered = { candidates: [candidates[1]], query: "#2" };
    table.render(filtered);
    table.expectPreserved();
    table.render({ ...filtered, selectedTokens: new Set(["saved", "draft"]) });
    table.expectPreserved();
    table.render({ candidates: [], query: "sin coincidencias", selectedTokens: new Set() });
    table.expectPreserved();
    table.render({ candidates: candidates.map((candidate) => ({ ...candidate })), selectedTokens: new Set(["draft"]) });
    table.expectPreserved();
  });

  it("cambiar la clave confirmada reinicia aun sin ganadores visibles; repetirla no reinicia", () => {
    const table = mountTable();
    const filtered = { candidates: [candidates[1]], query: "#2" };
    table.render(filtered);
    table.scrollDown();
    const confirmedSelectionKey = JSON.stringify(["draft", "saved"]);
    table.render({ ...filtered, confirmedSelectionKey });
    table.expectReset();
    table.scrollDown();
    table.render({ ...filtered, confirmedSelectionKey });
    table.expectPreserved();
    table.render({ ...filtered, confirmedSelectionKey: JSON.stringify([]) });
    table.expectReset();
  });

  it.each(["Participante número", "Región", "Comuna"])("%s reinicia por ASC, DESC y sin orden, pero no por rerender", (label) => {
    const table = mountTable();
    let view = table.render();
    for (let transition = 0; transition < 3; transition += 1) {
      table.scrollDown();
      view.clickSort(label);
      view = table.render();
      table.expectReset();
      table.scrollDown();
      view = table.render({ selectedTokens: new Set(["saved", "draft"]) });
      table.expectPreserved();
    }
    table.scrollDown();
    view.clickSort(label === "Región" ? "Comuna" : "Región");
    table.render();
    table.expectReset();
  });

  it("sin prop opcional conserva fallback por tokens, no por identidad u orden del array", () => {
    const table = mountTable();
    table.render({ confirmedSelectionKey: undefined });
    table.scrollDown();
    table.render({ confirmedSelectionKey: undefined, candidates: [...candidates].reverse().map((candidate) => ({ ...candidate })) });
    table.expectPreserved();
    table.render({ confirmedSelectionKey: undefined, candidates: candidates.map((candidate) => ({ ...candidate, selected: false })) });
    table.expectReset();
  });
});