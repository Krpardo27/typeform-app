import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Swal from "sweetalert2";
import { WinnerSelectionPanel } from "./WinnerSelectionPanel";
import { WinnerDataDialog } from "./WinnerDataDialog";
import { RandomSelectionControls } from "./RandomSelectionControls";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import { SelectionFooter } from "./SelectionFooter";
import { SelectionStatus } from "./SelectionStatus";
import { ResponseExportButton } from "../ResponseExportButton";
import { getRandomIndexes } from "./utils";
import type { WinnerSelectionPanelProps } from "./types";
import { downloadResponsesExport } from "@/features/typeform/utils/download-responses-export";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  deferEffects: false,
  slots: [] as Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }>,
}));

// Harness de eventos: conserva estado/refs entre renders y ejecuta las
// limpiezas de efectos para comprobar revisiones y desmontaje sin un DOM.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useMemo: (calculate: () => unknown) => calculate(),
  useState: <T,>(initial?: T | (() => T)) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: typeof initial === "function" ? (initial as () => T)() : initial };
    return [slot.value, (next: T | ((previous: T) => T)) => {
      slot.value = typeof next === "function" ? (next as (previous: T) => T)(slot.value as T) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: { current: initial } };
    return slot.value;
  },
  useEffect: (effect: () => void | (() => void), deps: readonly unknown[]) => {
    const slot = hooks.slots[hooks.cursor++] ??= {};
    if (hooks.deferEffects) return;
    if (!slot.deps || deps.some((value, index) => !Object.is(value, slot.deps![index]))) {
      slot.cleanup?.();
      slot.deps = deps;
      slot.cleanup = effect() ?? undefined;
    }
  },
  useTransition: () => [false, (callback: () => void) => callback()],
}));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/typeform/utils/download-responses-export", () => ({ downloadResponsesExport: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("./utils", async (importOriginal) => ({
  ...await importOriginal<typeof import("./utils")>(),
  getRandomIndexes: vi.fn(),
}));

const action = vi.fn();
const candidates = [
  { token: "a", label: "An****", region: "Norte" },
  { token: "b", label: "Lu****", region: "Sur" },
  { token: "c", label: "Ma****", region: "Sur" },
];

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function render(overrides: Partial<WinnerSelectionPanelProps> = {}) {
  hooks.cursor = 0;
  const elements = nodes(WinnerSelectionPanel({ action, candidates, currentPage: 1, itemsPerPage: 20, ...overrides }));
  function props<T extends ReactElement<Record<string, unknown>>["type"]>(type: T) {
    return elements.find((element) => element.type === type)!.props;
  }
  return {
    draw: props(RandomSelectionControls).onSelectRandomWinners as () => Promise<void>,
    controls: props(RandomSelectionControls),
    table: props(WinnerCandidatesTable),
    footer: props(SelectionFooter),
    status: props(SelectionStatus),
    form: props("form"),
    dialog: elements.find((element) => element.type === WinnerDataDialog)?.props,
    exports: elements.filter((element) => element.type === ResponseExportButton).map((element) => element.props),
    notices: elements.filter((element) => element.props.role === "status").map((element) => element.props.children),
    paragraphs: elements.filter((element) => element.type === "p").map((element) => Children.toArray(element.props.children as ReactNode).join("")),
    button: (label: string) => elements.find((element) => element.type === "button" && element.props.children === label)?.props,
    endReveal: () => {
      const button = elements.find((element) => element.type === "button" && element.props.children === "Finalizar consulta")!;
      (button.props.onClick as () => void)();
    },
  };
}

function tokens() {
  return [...render().table.selectedTokens as Set<string>];
}

// Instancia independiente del botón hijo: conserva los slots del panel y
// ejecuta su handler real contra el callback real consultSavedWinners(false).
function mountExportButton(props: Record<string, unknown>) {
  const panelSlots = hooks.slots;
  const panelCursor = hooks.cursor;
  hooks.slots = [];
  hooks.cursor = 0;
  try {
    const button = ResponseExportButton(props as ComponentProps<typeof ResponseExportButton>);
    const slots = hooks.slots;
    return { click: button.props.onClick, unmount: () => slots.forEach((slot) => slot.cleanup?.()) };
  } finally {
    hooks.slots = panelSlots;
    hooks.cursor = panelCursor;
  }
}

function unmount() {
  for (const slot of hooks.slots) {
    slot.cleanup?.();
    slot.cleanup = undefined;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.resetAllMocks();
  hooks.cursor = 0;
  hooks.deferEffects = false;
  hooks.slots = [];
  vi.mocked(getRandomIndexes).mockReturnValue([1, 0, 2]);
  vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as Awaited<ReturnType<typeof Swal.fire>>);
});
afterEach(() => {
  unmount();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("preview fixture: interacción local sin confirmación", () => {
  const begin = vi.fn();
  const read = vi.fn();
  const finish = vi.fn();
  const overrides: Partial<WinnerSelectionPanelProps> = {
    isFixturePreview: true,
    exportBaseHref: "/workspaces/workspace/forms/preview/responses/export",
    beginWinnerData: begin, readWinnerData: read, finishWinnerData: finish,
  };

  function expectReadOnly(view: ReturnType<typeof render>) {
    expect(view.footer.canSubmitSelection).toBe(false);
    const footer = nodes(SelectionFooter(view.footer as ComponentProps<typeof SelectionFooter>));
    const submit = footer.find((node) => node.type === "button" && node.props.type === "submit");
    expect(submit?.props.disabled).toBe(true);
    expect(submit?.props.children).toBe("Confirmar ganadores");
    expect(view.footer.disabledReason).toContain("Modo prueba local");
    expect(view.form.action).toBeUndefined();
    expect(action).not.toHaveBeenCalled();
    expect(begin).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    expect(view.dialog).toBeUndefined();
    expect([...view.table.viewableTokens as Set<string>]).toEqual([]);
    expect(view.exports.find(({ scope }) => scope === "winners")?.canExport).toBe(false);
  }

  async function submit(view: ReturnType<typeof render>) {
    // Un formulario montado impide que la prueba pase por el guard de ref null.
    (view.form.ref as { current: unknown }).current = {};
    const preventDefault = vi.fn();
    await (view.form.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  }

  it("avisa del modo ficticio y bloquea submit incluso tras seleccionar manualmente", async () => {
    const initial = render(overrides);
    expect(initial.notices).toContain(
      "Prueba local con participantes ficticios. Puedes filtrar y sortear; el guardado de ganadores está desactivado. No se envían respuestas a Typeform ni se modifican ganadores reales.",
    );
    expectReadOnly(initial);
    expect(initial.table.isPending).toBe(false);
    (initial.table.onCandidateChange as (token: string, checked: boolean) => void)("a", true);
    const selected = render(overrides);
    expect([...selected.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(selected.footer.hasSelectionChanged).toBe(true);
    await submit(selected);
    await submit(render(overrides)); // Tampoco reentrada programática.
    expect(Swal.fire).not.toHaveBeenCalled();
    expectReadOnly(render(overrides));
    (render(overrides).footer.onClearSelection as () => void)();
    expect([...render(overrides).table.selectedTokens as Set<string>]).toEqual([]);
    expectReadOnly(render(overrides));
  });

  it("filtra por región y búsqueda, sortea localmente y nunca confirma ni consulta datos reales", async () => {
    (render(overrides).controls.onRegionFilterChange as (value: string) => void)("Sur");
    (render(overrides).table.onQueryChange as (value: string) => void)("Lu****");
    let view = render(overrides);
    expect((view.table.candidates as typeof candidates).map(({ token }) => token)).toEqual(["b"]);
    expect(view.controls.filteredCandidatesCount).toBe(1);
    expect(view.controls.isPending).toBe(false);
    vi.mocked(getRandomIndexes).mockReturnValueOnce([0]);
    await view.draw();
    view = render(overrides);
    expect(getRandomIndexes).toHaveBeenCalledExactlyOnceWith(1);
    expect([...view.table.selectedTokens as Set<string>]).toEqual(["b"]);
    expect(view.footer.hasSelectionChanged).toBe(true);
    expect(view.status.selectionNotice).toContain("Se seleccionó 1 participante");
    await submit(view);
    expect(Swal.fire).not.toHaveBeenCalled();
    expectReadOnly(render(overrides));

    // Reemplazar la selección sí puede confirmar un sorteo local; no un guardado.
    vi.advanceTimersByTime(800);
    (render(overrides).table.onQueryChange as (value: string) => void)("");
    vi.mocked(getRandomIndexes).mockReturnValueOnce([1, 0]);
    await render(overrides).draw();
    expect(Swal.fire).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ titleText: "¿Reemplazar la selección actual?" }));
    expect([...render(overrides).table.selectedTokens as Set<string>]).toEqual(["c"]);
    await submit(render(overrides));
    expectReadOnly(render(overrides));
  });
});

describe("sorteo local protegido", () => {
  it("cambiar región filtra tabla y sorteo por valores reales sin perder selecciones ocultas", async () => {
    const overrides = { candidates: [
      { token: "rios", label: "An****", email: "ana*****", city: "Valdivia", region: "Región de Los Ríos", participantNumber: 12 },
      { token: "lagos", label: "Lu****", email: "lui*****", city: "Puerto Varas", region: "Región de Los Lagos", participantNumber: 112, selected: true },
      { token: "missing", label: "Sin región", participantNumber: 3 },
    ] };
    expect(render(overrides).controls.regionOptions).toEqual(["Región de Los Lagos", "Región de Los Ríos"]);
    (render(overrides).controls.onRegionFilterChange as (value: string) => void)("Región de Los Ríos");
    const filtered = render(overrides);
    expect(filtered.table.candidates).toEqual([overrides.candidates[0]]);
    expect(filtered.controls.filteredCandidatesCount).toBe(1);
    expect(filtered.footer.hiddenSelectedCount).toBe(1);
    expect([...filtered.table.selectedTokens as Set<string>]).toEqual(["lagos"]);
    expect(filtered.controls.regionOptions).toEqual(["Región de Los Lagos", "Región de Los Ríos"]);

    (filtered.table.onQueryChange as (value: string) => void)("ANA*****");
    expect(render(overrides).controls.filteredCandidatesCount).toBe(1);
    vi.mocked(getRandomIndexes).mockReturnValueOnce([0]);
    await render(overrides).draw();
    expect(getRandomIndexes).toHaveBeenCalledWith(1);
    expect([...render(overrides).table.selectedTokens as Set<string>]).toEqual(["rios"]);

    (render(overrides).table.onQueryChange as (value: string) => void)("");
    (render(overrides).controls.onRegionFilterChange as (value: string) => void)("");
    expect(render(overrides).table.candidates).toHaveLength(3);
  });

  it("sin selección sortea una vez, anuncia el resultado y no guarda", async () => {
    await render().draw();
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(getRandomIndexes).toHaveBeenCalledOnce();
    expect(tokens()).toEqual(["b"]);
    expect(render().status.selectionNotice).toBe("Se seleccionó 1 participante. Revisa y confirma para guardar.");
    expect(render().controls.isRandomCooldown).toBe(true);
    expect(render().controls.isPending).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("los ausentes siguen visibles con filtros, solo permiten retirar y nunca entran al sorteo", async () => {
    const overrides = { initialRegionFilter: "Sur", candidates: [
      { token: "missing-secret", label: "Participante no disponible", participantNumber: 4, selected: true, missingResponse: true },
      ...candidates,
    ] };
    let view = render(overrides);
    expect([...view.table.selectedTokens as Set<string>]).toEqual(["missing-secret"]);
    expect((view.table.candidates as typeof overrides.candidates).map(({ token }) => token)).toEqual(["missing-secret", "b", "c"]);
    expect(view.controls.filteredCandidatesCount).toBe(2);
    (view.table.onQueryChange as (query: string) => void)("sin coincidencias");
    view = render(overrides);
    expect((view.table.candidates as typeof overrides.candidates).map(({ token }) => token)).toEqual(["missing-secret"]);
    expect(view.controls.filteredCandidatesCount).toBe(0);
    await view.draw();
    expect(getRandomIndexes).not.toHaveBeenCalled();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("missing-secret", false);
    view = render(overrides);
    expect(view.footer.canSubmitSelection).toBe(true);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("missing-secret", true);
    expect([...render(overrides).table.selectedTokens as Set<string>]).toEqual([]);
    (view.table.onQueryChange as (query: string) => void)("");
    vi.mocked(getRandomIndexes).mockReturnValueOnce([0, 1]);
    await render(overrides).draw();
    expect(getRandomIndexes).toHaveBeenCalledWith(2);
    expect([...render(overrides).table.selectedTokens as Set<string>]).toEqual(["b"]);
    expect(action).not.toHaveBeenCalled();
  });

  it("el ref bloquea doble clic incluso antes del siguiente render y durante 800 ms", async () => {
    const { draw } = render();
    await draw();
    await draw();
    await render().draw();
    expect(getRandomIndexes).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(799);
    await render().draw();
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(render().controls.isRandomCooldown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(render().controls.isRandomCooldown).toBe(false);
    await render().draw();
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect(getRandomIndexes).toHaveBeenCalledTimes(2);
  });

  it("cancelar el reemplazo conserva tokens y motivo y no usa aleatoriedad", async () => {
    const overrides = { candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "a" })), initialReason: "Motivo anterior" };
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as Awaited<ReturnType<typeof Swal.fire>>);
    await render(overrides).draw();
    const after = render(overrides);
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(after.controls.reason).toBe("Motivo anterior");
    expect(after.controls.isRandomCooldown).toBe(false);
    expect(after.status.selectionNotice).toBeUndefined();
    expect(getRandomIndexes).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      titleText: "¿Reemplazar la selección actual?", focusCancel: true,
      cancelButtonText: "Conservar selección",
      text: expect.stringContaining("seleccionados fuera del filtro"),
    }));
  });

  it("confirmar reemplaza toda la selección, pero sortea solo entre los candidatos filtrados", async () => {
    const overrides = { candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "a" })), initialRegionFilter: "Sur" };
    await render(overrides).draw();
    const after = render(overrides);
    expect(getRandomIndexes).toHaveBeenCalledWith(2);
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["c"]);
    expect(after.controls.reason).toBe("Selección aleatoria de ganadores - Sur");
    expect(after.status.selectionNotice).toContain("Revisa y confirma para guardar");
    expect(action).not.toHaveBeenCalled();
  });

  it("conserva el formato plural del aviso para varios participantes", async () => {
    (render().controls.onRandomWinnerCountChange as (value: string) => void)("2");
    await render().draw();
    expect(tokens()).toEqual(["b", "a"]);
    expect(render().status.selectionNotice).toBe("Se seleccionaron 2 participantes. Revisa y confirma para guardar.");
  });

  it("bloquea reentrada, selección manual, limpieza y guardado durante el modal", async () => {
    let resolve!: (result: Awaited<ReturnType<typeof Swal.fire>>) => void;
    vi.mocked(Swal.fire).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const overrides = { candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "a" })) };
    const first = render(overrides);
    const draw = first.draw();
    await first.draw();
    (first.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (first.footer.onClearSelection as () => void)();
    await (first.form.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
    expect(Swal.fire).toHaveBeenCalledOnce();
    const during = render(overrides);
    expect([...during.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(during.controls.isPending).toBe(true);
    expect(during.footer.isConfirming).toBe(true);
    expect(action).not.toHaveBeenCalled();
    resolve({ isConfirmed: false } as Awaited<ReturnType<typeof Swal.fire>>);
    await draw;
    expect(render(overrides).controls.isPending).toBe(false);
  });

  it("si cambian los participantes durante el modal no aplica el sorteo obsoleto", async () => {
    let resolve!: (result: Awaited<ReturnType<typeof Swal.fire>>) => void;
    vi.mocked(Swal.fire).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const draw = render({ candidates: candidates.map((candidate) => ({ ...candidate, selected: true })) }).draw();
    render({ candidates: [{ token: "nuevo", label: "Nuevo participante" }] });
    resolve({ isConfirmed: true } as Awaited<ReturnType<typeof Swal.fire>>);
    await draw;
    expect(getRandomIndexes).not.toHaveBeenCalled();
    expect(render().status.feedback).toContain("Los participantes cambiaron");
    expect(render().controls.isRandomCooldown).toBe(false);
  });

  it("un fallo del generador conserva la selección y permite reintentar", async () => {
    const overrides = { candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "a" })), initialReason: "Original" };
    vi.mocked(getRandomIndexes).mockImplementationOnce(() => { throw new Error("crypto no disponible"); });
    await render(overrides).draw();
    const after = render(overrides);
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(after.controls.reason).toBe("Original");
    expect(after.controls.isRandomCooldown).toBe(false);
    expect(after.status.feedback).toContain("La selección anterior se conserva");
    await after.draw();
    expect(getRandomIndexes).toHaveBeenCalledTimes(2);
    expect(render(overrides).status.feedback).toBeUndefined();
  });

  it("un fallo del modal no altera la selección ni deja el panel bloqueado", async () => {
    vi.mocked(Swal.fire).mockRejectedValueOnce(new Error("modal fallido"));
    const overrides = { candidates: candidates.map((candidate) => ({ ...candidate, selected: true })) };
    await render(overrides).draw();
    const after = render(overrides);
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["a", "b", "c"]);
    expect(after.controls.isPending).toBe(false);
    expect(after.controls.isRandomCooldown).toBe(false);
    expect(getRandomIndexes).not.toHaveBeenCalled();
  });

  it("editar o limpiar la selección retira el aviso anterior", async () => {
    await render().draw();
    (render().table.onCandidateChange as (token: string, checked: boolean) => void)("a", true);
    expect(render().status.selectionNotice).toBeUndefined();
    vi.advanceTimersByTime(800);
    await render().draw();
    expect(render().status.selectionNotice).toBeDefined();
    (render().footer.onClearSelection as () => void)();
    expect(render().status.selectionNotice).toBeUndefined();
  });

  it("no sortea si no hay candidatos y limpia el temporizador al desmontar", async () => {
    await render({ candidates: [] }).draw();
    expect(getRandomIndexes).not.toHaveBeenCalled();
    await render().draw();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("desmontar con el modal abierto invalida su resultado", async () => {
    let resolve!: (result: Awaited<ReturnType<typeof Swal.fire>>) => void;
    vi.mocked(Swal.fire).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const draw = render({ candidates: candidates.map((candidate) => ({ ...candidate, selected: true })) }).draw();
    unmount();
    resolve({ isConfirmed: true } as Awaited<ReturnType<typeof Swal.fire>>);
    await draw;
    expect(getRandomIndexes).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("vida del flujo temporal de consulta", () => {
  const read = vi.fn();
  const finish = vi.fn<(token: string) => Promise<void>>();
  function props() {
    return { candidates, readWinnerData: read, finishWinnerData: finish };
  }
  async function confirm() {
    finish.mockResolvedValue(undefined);
    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 1, grant: { flowToken: "flow", expiresAt: new Date(Date.now() + 120_000).toISOString() } });
    (render(props()).table.onCandidateChange as (token: string, checked: boolean) => void)("a", true);
    const view = render(props());
    (view.form.ref as { current: unknown }).current = {};
    await (view.form.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
    await Promise.resolve();
    return render(props());
  }

  it("solo habilita los tokens confirmados y espera el clic para crear el modal", async () => {
    const after = await confirm();
    expect([...after.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect(action).toHaveBeenCalledOnce();
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect(after.dialog).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
    (after.table.onViewCandidate as (token: string) => void)("a");
    expect(render(props()).dialog?.initialToken).toBe("a");
    expect(render(props()).dialog?.grant).toMatchObject({ flowToken: "flow" });
    expect(render(props()).dialog?.participants).toEqual([{ token: "a", label: "An****" }]);
  });

  it("Finalizar revoca el grant de una selección recién modificada sin deshacer sus tokens", async () => {
    const after = await confirm();
    after.endReveal();
    const closed = render(props());
    expect(finish).toHaveBeenCalledExactlyOnceWith("flow");
    expect([...closed.table.viewableTokens as Set<string>]).toEqual([]);
    expect(closed.dialog).toBeUndefined();
    expect([...closed.table.selectedTokens as Set<string>]).toEqual(["a"]);
    // Cerrar el permiso no deshace el guardado aunque las props sigan antiguas.
    expect(closed.footer.canSubmitSelection).toBe(false);
    expect(closed.footer.hasSelectionChanged).toBe(false);
    expect(closed.table.candidates).toContainEqual(expect.objectContaining({ token: "a", selected: true }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("caduca aunque el usuario no cierre el detalle", async () => {
    await confirm();
    vi.advanceTimersByTime(120_000);
    const expired = render(props());
    expect([...expired.table.viewableTokens as Set<string>]).toEqual([]);
    expect(finish).toHaveBeenCalledOnce();
  });

  it("cambiar la selección finaliza también el permiso anterior", async () => {
    const after = await confirm();
    (after.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    const edited = render(props());
    expect([...edited.table.viewableTokens as Set<string>]).toEqual([]);
    expect(finish).toHaveBeenCalledOnce();
  });

  it("abandonar la pantalla antes de recibir el permiso lo revoca al llegar", async () => {
    finish.mockResolvedValue(undefined);
    let resolve!: (value: unknown) => void;
    action.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    (render(props()).table.onCandidateChange as (token: string, checked: boolean) => void)("a", true);
    const view = render(props());
    (view.form.ref as { current: unknown }).current = {};
    await (view.form.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
    unmount();
    resolve({ status: "confirmed", winnerCount: 1, grant: { flowToken: "late-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() } });
    await Promise.resolve();
    await Promise.resolve();
    expect(finish).toHaveBeenCalledWith("late-flow");
  });
});

describe("consulta de ganadores guardados independiente del guardado", () => {
  const begin = vi.fn<NonNullable<WinnerSelectionPanelProps["beginWinnerData"]>>();
  const read = vi.fn<NonNullable<WinnerSelectionPanelProps["readWinnerData"]>>();
  const finish = vi.fn<NonNullable<WinnerSelectionPanelProps["finishWinnerData"]>>();
  function props(): WinnerSelectionPanelProps {
    return {
      action, candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "a" })),
      currentPage: 1, itemsPerPage: 3, initialReason: "Motivo guardado",
      winnerRevision: "revision-a",
      beginWinnerData: begin, readWinnerData: read, finishWinnerData: finish,
      exportBaseHref: "/workspaces/w/forms/f/responses/export",
    };
  }
  function setup() {
    finish.mockResolvedValue(undefined);
    begin.mockResolvedValue({ status: "ready", grant: { flowToken: "saved-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() }, participants: [{ token: "a", label: "Etiqueta servidor" }] });
    return render(props());
  }
  async function consult() {
    await (render(props()).button("Consultar ganadores guardados")!.onClick as () => Promise<void>)();
    return render(props());
  }
  async function submit(view: ReturnType<typeof render>) {
    (view.form.ref as { current: unknown }).current = {};
    await (view.form.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: vi.fn() });
    await Promise.resolve();
  }

  function savedTokens(view: ReturnType<typeof render>) {
    return (view.table.candidates as Array<{ token: string; selected?: boolean }>)
      .filter(({ selected }) => selected).map(({ token }) => token).sort();
  }

  async function saveSeveral(withGrant = true) {
    const initial = setup();
    (initial.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 2, ...(withGrant ? {
      grant: { flowToken: "several-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
    } : {}) });
    await submit(render(props()));
    return render(props());
  }

  it("pasa la clave confirmada completa: filtros y borrador no la cambian, confirmar y retirar sí", async () => {
    const initial = setup();
    expect(initial.table.confirmedSelectionKey).toBe(JSON.stringify(["a"]));
    (initial.controls.onRegionFilterChange as (value: string) => void)("Sur");
    let view = render(props());
    expect((view.table.candidates as typeof candidates).map(({ token }) => token)).toEqual(["b", "c"]);
    expect(savedTokens(view)).toEqual([]); // El ganador a está oculto, no retirado.
    expect(view.table.confirmedSelectionKey).toBe(initial.table.confirmedSelectionKey);

    (view.table.onQueryChange as (value: string) => void)("Lu****");
    view = render(props());
    expect((view.table.candidates as typeof candidates).map(({ token }) => token)).toEqual(["b"]);
    expect(view.table.confirmedSelectionKey).toBe(initial.table.confirmedSelectionKey);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    view = render(props());
    expect([...view.table.selectedTokens as Set<string>]).toEqual(["a", "b"]);
    expect(view.table.confirmedSelectionKey).toBe(initial.table.confirmedSelectionKey);

    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 2 });
    await submit(view);
    view = render(props());
    expect(savedTokens(view)).toEqual(["b"]);
    expect(view.table.confirmedSelectionKey).toBe(JSON.stringify(["a", "b"]));
    expect(view.table.confirmedSelectionKey).not.toBe(initial.table.confirmedSelectionKey);
    const confirmedKey = view.table.confirmedSelectionKey;

    (view.table.onQueryChange as (value: string) => void)("Ma****");
    view = render(props());
    expect((view.table.candidates as typeof candidates).map(({ token }) => token)).toEqual(["c"]);
    expect(savedTokens(view)).toEqual([]);
    expect(view.table.confirmedSelectionKey).toBe(confirmedKey);
    (view.controls.onRegionFilterChange as (value: string) => void)("Norte");
    view = render(props());
    expect(view.table.candidates).toEqual([]);
    expect(view.table.confirmedSelectionKey).toBe(confirmedKey);
    (view.footer.onClearSelection as () => void)();
    view = render(props());
    expect([...view.table.selectedTokens as Set<string>]).toEqual([]);
    expect(view.table.confirmedSelectionKey).toBe(confirmedKey);

    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 0 });
    await submit(view);
    view = render(props());
    expect(view.table.confirmedSelectionKey).toBe(JSON.stringify([]));
    expect(view.table.confirmedSelectionKey).not.toBe(confirmedKey);
    expect(action).toHaveBeenCalledTimes(2);
    expect(props().candidates.filter(({ selected }) => selected).map(({ token }) => token)).toEqual(["a"]);
  });

  it.each([true, false])("guardar varios con grant=%s actualiza insignias, consulta, exportación y Sin cambios con props antiguas", async (withGrant) => {
    const original = props().candidates;
    const after = await saveSeveral(withGrant);
    expect(savedTokens(after)).toEqual(["a", "b"]);
    expect(after.status.hasSavedWinnerSelection).toBe(true);
    expect(after.paragraphs).toContain("2 ganadores guardados.");
    expect(after.button("Consultar ganadores guardados")).toBeDefined();
    expect(after.footer.canSubmitSelection).toBe(false);
    expect(after.footer.hasSelectionChanged).toBe(false);
    const footer = nodes(SelectionFooter(after.footer as ComponentProps<typeof SelectionFooter>));
    expect(footer.some((node) => node.props.children === "Sin cambios pendientes.")).toBe(true);
    expect([...after.table.viewableTokens as Set<string>].sort()).toEqual(["a", "b"]);
    expect(after.exports.find(({ scope }) => scope === "winners")?.canExport).toBe(true);
    await submit(after);
    expect(action).toHaveBeenCalledOnce();
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect(original.filter(({ selected }) => selected).map(({ token }) => token)).toEqual(["a"]);
  });

  it.each(["editar", "limpiar", "sortear", "Finalizar", "TTL"])("%s no retira las insignias guardadas ni las convierte en borrador", async (operation) => {
    const after = await saveSeveral();
    if (operation === "editar") {
      (after.table.onCandidateChange as (token: string, checked: boolean) => void)("a", false);
      (after.table.onCandidateChange as (token: string, checked: boolean) => void)("c", true);
    } else if (operation === "limpiar") (after.footer.onClearSelection as () => void)();
    else if (operation === "sortear") await after.draw();
    else if (operation === "Finalizar") after.endReveal();
    else vi.advanceTimersByTime(120_000);
    const current = render(props());
    expect(savedTokens(current)).toEqual(["a", "b"]);
    expect(current.paragraphs).toContain("2 ganadores guardados.");
    expect(current.exports.find(({ scope }) => scope === "winners")?.canExport).toBe(true);
    expect([...current.table.viewableTokens as Set<string>].sort()).toEqual(["a", "b"]);
    expect(action).toHaveBeenCalledOnce();
  });

  it("retirar todos confirma el snapshot vacío y quita insignias y consulta incluso sin grant ni revalidación", async () => {
    const after = await saveSeveral();
    (after.footer.onClearSelection as () => void)();
    expect(savedTokens(render(props()))).toEqual(["a", "b"]);
    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 0 });
    await submit(render(props()));
    const cleared = render(props());
    expect(savedTokens(cleared)).toEqual([]);
    expect([...cleared.table.viewableTokens as Set<string>]).toEqual([]);
    expect(cleared.status.hasSavedWinnerSelection).toBe(false);
    expect(cleared.paragraphs).not.toContain("1 ganadores guardados.");
    expect(cleared.button("Consultar ganadores guardados")).toBeUndefined();
    expect(cleared.exports.find(({ scope }) => scope === "winners")?.canExport).toBe(false);
    expect(cleared.footer.canSubmitSelection).toBe(false);
    expect(cleared.footer.hasSelectionChanged).toBe(false);
    expect(cleared.status.selectionNotice).toContain("Selección retirada");
    expect((action.mock.calls[1][0] as FormData).getAll("winnerToken")).toEqual([]);
  });

  it.each(["denied", "error"])("un guardado %s no promueve las insignias ni habilita datos del borrador", async (result) => {
    const initial = setup();
    (initial.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    if (result === "denied") action.mockResolvedValueOnce({ status: "denied", message: "No permitido" });
    else action.mockRejectedValueOnce(new Error("Sin red"));
    await submit(render(props()));
    const failed = render(props());
    expect(savedTokens(failed)).toEqual(["a"]);
    expect(failed.table.confirmedSelectionKey).toBe(initial.table.confirmedSelectionKey);
    expect([...failed.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect(failed.paragraphs).toContain("1 ganadores guardados.");
    expect(failed.footer.canSubmitSelection).toBe(true);
    expect(failed.status.feedback).toBeTruthy();
  });

  it("la revalidación propia conserva un borrador posterior, las insignias y el TTL original", async () => {
    const after = await saveSeveral();
    after.endReveal();
    (render(props()).table.onCandidateChange as (token: string, checked: boolean) => void)("c", true);
    const expected = { ...props(), winnerRevision: "own-several", candidates: props().candidates.map((candidate) => ({
      ...candidate, selected: candidate.token !== "c",
    })) };
    const revalidated = render(expected);
    expect(savedTokens(revalidated)).toEqual(["a", "b"]);
    expect([...revalidated.table.selectedTokens as Set<string>]).toEqual(["a", "b", "c"]);
    expect(revalidated.footer.canSubmitSelection).toBe(true);
    expect(finish).toHaveBeenCalledExactlyOnceWith("several-flow");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["firma", "tokens", "scope"])("una revisión externa de %s descarta el overlay en render y no resucita al revertir", async (change) => {
    await saveSeveral();
    const external = { ...props(), ...(change === "firma" ? { winnerRevision: "external-same-server-tokens" }
      : change === "scope" ? { exportBaseHref: "/workspaces/other/forms/f/responses/export" }
      : { candidates: props().candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "c" })) }) };
    hooks.deferEffects = true;
    const immediate = render(external);
    expect(savedTokens(immediate)).toEqual(change === "tokens" ? ["c"] : ["a"]);
    expect(immediate.exports.find(({ scope }) => scope === "winners")?.winnerFlowToken).toBeUndefined();
    hooks.deferEffects = false;
    render(external);
    expect(savedTokens(render(props()))).toEqual(["a"]);
    expect(render(props()).exports.find(({ scope }) => scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("several-flow");
  });

  it("revoca el resultado de un guardado si una revisión incompatible se renderizó antes de ejecutar sus efectos", async () => {
    const initial = setup();
    (initial.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    let resolve!: (value: unknown) => void;
    action.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    await submit(render(props()));
    const external = { ...props(), winnerRevision: "concurrent-external" };
    hooks.deferEffects = true;
    render(external);
    resolve({ status: "confirmed", winnerCount: 2, grant: {
      flowToken: "concurrent-flow", expiresAt: new Date(Date.now() + 120_000).toISOString(),
    } });
    await Promise.resolve();
    const immediate = render(external);
    expect(savedTokens(immediate)).toEqual(["a"]);
    expect(immediate.exports.find(({ scope }) => scope === "winners")?.winnerFlowToken).toBeUndefined();
    hooks.deferEffects = false;
    render(external);
    render(external);
    expect(finish).toHaveBeenCalledExactlyOnceWith("concurrent-flow");
    expect(savedTokens(render(props()))).toEqual(["a"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clicar la segunda fila guardada inicia permiso y abre exactamente ese token sin guardar ni revelar no ganadores", async () => {
    setup();
    const overrides = { ...props(), candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token !== "c" })) };
    begin.mockResolvedValueOnce({
      status: "ready", grant: { flowToken: "second-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "a", label: "Primero servidor" }, { token: "b", label: "Segundo servidor" }],
    });
    const initial = render(overrides);
    expect(initial.dialog).toBeUndefined();
    expect([...initial.table.viewableTokens as Set<string>]).toEqual(["a", "b"]);
    (initial.table.onViewCandidate as (token: string) => void)("c");
    expect(begin).not.toHaveBeenCalled();
    (initial.table.onViewCandidate as (token: string) => void)("b");
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    expect(render(overrides).dialog).toBeUndefined();
    await Promise.resolve();
    const opened = render(overrides);
    expect(opened.dialog).toMatchObject({
      initialToken: "b", grant: { flowToken: "second-flow" }, readData: read,
      participants: [{ token: "a", label: "An****" }, { token: "b", label: "Lu****" }],
    });
    expect([...opened.table.selectedTokens as Set<string>]).toEqual(["a", "b"]);
    expect(opened.controls.reason).toBe("Motivo guardado");
    expect(opened.footer.hasSelectionChanged).toBe(false);
    (opened.dialog!.onClose as () => void)();
    (render(overrides).table.onViewCandidate as (token: string) => void)("c");
    expect(render(overrides).dialog).toBeUndefined();
    (render(overrides).table.onViewCandidate as (token: string) => void)("b");
    expect(render(overrides).dialog?.initialToken).toBe("b");
    expect(begin).toHaveBeenCalledOnce();
    for (const operation of [action, Swal.fire, read, finish]) expect(operation).not.toHaveBeenCalled();
  });

  it.each(["denegado", "rechazado"])("el clic de fila con permiso %s no abre modal ni lee datos", async (result) => {
    const view = setup();
    if (result === "denegado") begin.mockResolvedValueOnce({ status: "denied", message: "Sin permiso" });
    else begin.mockRejectedValueOnce(new Error("Sin red"));
    (view.table.onViewCandidate as (token: string) => void)("a");
    await Promise.resolve();
    const failed = render(props());
    expect(failed.dialog).toBeUndefined();
    expect(failed.button("Ver datos de ganadores")).toBeUndefined();
    expect(failed.status.feedback).toBeTruthy();
    expect(failed.table.isPending).toBe(false);
    expect([...failed.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    for (const operation of [action, Swal.fire, read, finish]) expect(operation).not.toHaveBeenCalled();
  });

  it("descarta el grant de un clic de fila que llega tras desmontar y lo revoca sin modal", async () => {
    const view = setup();
    let resolve!: (value: Awaited<ReturnType<typeof begin>>) => void;
    begin.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    (view.table.onViewCandidate as (token: string) => void)("a");
    unmount();
    resolve({ status: "ready", grant: { flowToken: "late-row-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() }, participants: [{ token: "a", label: "Servidor" }] });
    await Promise.resolve();
    expect(render(props()).dialog).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("late-row-flow");
    expect(vi.getTimerCount()).toBe(0);
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    for (const operation of [action, Swal.fire, read]) expect(operation).not.toHaveBeenCalled();
  });

  it.each(["beginWinnerData", "readWinnerData", "finishWinnerData"] as const)("sin %s no autoriza las filas persistidas", (missing) => {
    setup();
    const view = render({ ...props(), [missing]: undefined });
    expect([...view.table.viewableTokens as Set<string>]).toEqual([]);
    if (view.table.onViewCandidate) (view.table.onViewCandidate as (token: string) => void)("a");
    expect(view.dialog).toBeUndefined();
    for (const operation of [begin, read, finish, action]) expect(operation).not.toHaveBeenCalled();
  });

  it("consultar llama beginWinnerData sin argumentos, no action, confirmación ni lectura anticipada", async () => {
    setup();
    const after = await consult();
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    expect(action).not.toHaveBeenCalled();
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    expect(after.footer.canSubmitSelection).toBe(false);
    expect(after.dialog).toMatchObject({
      initialToken: "a", participants: [{ token: "a", label: "An****" }], readData: read,
      grant: { flowToken: "saved-flow" }, exportBaseHref: props().exportBaseHref,
      selectionFormRef: after.form.ref,
    });
  });

  it("otra selección persistida oculta modal y token de exportación en el render, y revoca una sola vez", async () => {
    setup();
    await consult();
    const changed = { ...props(), candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "b" })) };
    hooks.deferEffects = true;
    const immediate = render(changed);
    expect(immediate.dialog).toBeUndefined();
    expect(immediate.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect([...immediate.table.viewableTokens as Set<string>]).toEqual(["b"]);
    expect(finish).not.toHaveBeenCalled();
    hooks.deferEffects = false;
    render(changed);
    render(changed);
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
    expect(vi.getTimerCount()).toBe(0);
    expect(render(props()).dialog).toBeUndefined();
    expect(render(props()).exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
  });

  it("recrear y reordenar props con la misma selección conserva el grant abierto", async () => {
    setup();
    const opened = await consult();
    const same = render({ ...props(), candidates: [...props().candidates].reverse().map((candidate) => ({ ...candidate })) });
    expect(same.dialog?.grant).toBe(opened.dialog?.grant);
    expect(same.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("saved-flow");
    expect(finish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("los mismos tokens con otra firma ocultan en render, revocan y no resucitan al volver a la firma anterior", async () => {
    setup();
    await consult();
    const changed = { ...props(), winnerRevision: "revision-a-reconfirmed" };
    hooks.deferEffects = true;
    const immediate = render(changed);
    expect(immediate.dialog).toBeUndefined();
    expect(immediate.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).not.toHaveBeenCalled();
    hooks.deferEffects = false;
    render(changed);
    render(changed);
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
    expect(vi.getTimerCount()).toBe(0);
    expect(render(props()).dialog).toBeUndefined();
    expect(render(props()).exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();

    begin.mockResolvedValueOnce({ status: "denied", message: "Selección descartada" });
    const current = render(changed);
    (current.table.onViewCandidate as (token: string) => void)("a");
    await Promise.resolve();
    expect(render(changed).dialog).toBeUndefined();
    expect(render(changed).status.feedback).toBe("Selección descartada");
    expect(begin).toHaveBeenCalledTimes(2);
    for (const operation of [action, Swal.fire, read]) expect(operation).not.toHaveBeenCalled();
  });

  it("consulta con props antiguas acepta solo la primera transición de tokens que coincide con begin, sin renovar TTL", async () => {
    setup();
    begin.mockResolvedValueOnce({
      status: "ready", grant: { flowToken: "new-tokens-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "b", label: "Servidor" }],
    });
    await consult();
    vi.advanceTimersByTime(30_000);
    const changed = { ...props(), winnerRevision: "revision-b", candidates: candidates.map((candidate) => ({
      ...candidate, selected: candidate.token === "b",
    })) };
    const accepted = render(changed);
    expect(accepted.dialog).toMatchObject({ initialToken: "b", grant: { flowToken: "new-tokens-flow" } });
    expect(savedTokens(accepted)).toEqual(["b"]);
    expect(accepted.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("new-tokens-flow");
    expect(finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(90_000);
    expect(render(changed).dialog).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("new-tokens-flow");
    for (const operation of [action, Swal.fire, read]) expect(operation).not.toHaveBeenCalled();
  });

  it("consulta con props antiguas no acepta firma nueva si begin devuelve los mismos tokens", async () => {
    setup();
    await consult();
    const changed = render({ ...props(), winnerRevision: "revision-new-same-tokens" });
    expect(changed.dialog).toBeUndefined();
    expect(changed.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["consulta", "guardado", "confirmación"])("un cambio de firma con mismos tokens descarta %s pendiente", async (kind) => {
    const view = setup();
    let resolve!: (value: unknown) => void;
    const deferred = new Promise((done) => { resolve = done; });
    let pending: Promise<unknown> | undefined;
    if (kind === "consulta") {
      begin.mockImplementationOnce(async () => await deferred as Awaited<ReturnType<typeof begin>>);
      pending = (view.button("Consultar ganadores guardados")!.onClick as () => Promise<void>)();
    } else {
      (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
      if (kind === "guardado") {
        action.mockReturnValueOnce(deferred);
        await submit(render(props()));
      } else {
        vi.mocked(Swal.fire).mockReturnValueOnce(deferred as ReturnType<typeof Swal.fire>);
        pending = submit(render(props()));
      }
    }
    const changed = { ...props(), winnerRevision: "same-tokens-new-date" };
    render(changed);
    resolve({ isConfirmed: true, status: kind === "consulta" ? "ready" : "confirmed", winnerCount: 2,
      grant: { flowToken: "discarded-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "a", label: "Servidor" }],
    });
    await pending;
    await Promise.resolve();
    const discarded = render(changed);
    expect(discarded.dialog).toBeUndefined();
    expect(discarded.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    if (kind === "confirmación") {
      expect(action).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(discarded.status.feedback).toContain("vuelve a confirmar");
    } else expect(finish).toHaveBeenCalledExactlyOnceWith("discarded-flow");
    expect(read).not.toHaveBeenCalled();
  });

  it("si una respuesta se vuelve ausente, no queda en el modal ni en sus opciones de lectura", async () => {
    setup();
    const overrides = { ...props(), candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token !== "c" })) };
    begin.mockResolvedValueOnce({
      status: "ready", grant: { flowToken: "two-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "a", label: "Primero" }, { token: "b", label: "Segundo" }],
    });
    (render(overrides).table.onViewCandidate as (token: string) => void)("a");
    await Promise.resolve();
    expect(render(overrides).dialog?.participants).toHaveLength(2);
    const missing = { ...overrides, candidates: overrides.candidates.map((candidate) => ({ ...candidate, missingResponse: candidate.token === "a" })) };
    const after = render(missing);
    expect(after.dialog).toBeUndefined();
    expect([...after.table.viewableTokens as Set<string>]).toEqual(["b"]);
    (after.button("Ver datos de ganadores")!.onClick as () => void)();
    expect(render(missing).dialog).toMatchObject({ initialToken: "b", participants: [{ token: "b", label: "Lu****" }] });
    expect(finish).not.toHaveBeenCalled();
  });

  it.each(["antes", "después"])("revalidación propia %s de recibir el grant conserva el acceso y TTL", async (order) => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("a", false);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    let resolve!: (value: unknown) => void;
    action.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    await submit(render(props()));
    const expected = { ...props(), winnerRevision: "revision-b", candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "b" })) };
    if (order === "antes") render(expected);
    resolve({ status: "confirmed", winnerCount: 1, grant: { flowToken: "own-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() } });
    await Promise.resolve();
    if (order === "después") {
      const granted = render(props());
      (granted.table.onViewCandidate as (token: string) => void)("b");
      vi.advanceTimersByTime(30_000);
    }
    let after = render(expected);
    expect(savedTokens(after)).toEqual(["b"]);
    expect(after.footer.canSubmitSelection).toBe(false);
    expect(after.footer.hasSelectionChanged).toBe(false);
    expect(after.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("own-flow");
    (after.table.onViewCandidate as (token: string) => void)("b");
    after = render(expected);
    expect(after.dialog).toMatchObject({ initialToken: "b", grant: { flowToken: "own-flow" } });
    expect(finish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(order === "después" ? 90_000 : 120_000);
    expect(render(expected).dialog).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("own-flow");
  });

  it.each(["consulta", "guardado"])("ignora y revoca una respuesta tardía de %s tras props de otra selección", async (kind) => {
    const view = setup();
    let resolve!: (value: unknown) => void;
    const deferred = new Promise((done) => { resolve = done; });
    let pending: Promise<unknown> | undefined;
    if (kind === "consulta") {
      begin.mockImplementationOnce(async () => await deferred as Awaited<ReturnType<typeof begin>>);
      pending = (view.button("Consultar ganadores guardados")!.onClick as () => Promise<void>)();
    } else {
      action.mockReturnValueOnce(deferred);
      (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
      await submit(render(props()));
    }
    const changed = { ...props(), candidates: candidates.map((candidate) => ({ ...candidate, selected: candidate.token === "c" })) };
    render(changed);
    resolve({ status: kind === "consulta" ? "ready" : "confirmed", winnerCount: 2,
      grant: { flowToken: "stale-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "a", label: "Servidor" }],
    });
    await pending;
    await Promise.resolve();
    const after = render(changed);
    expect(savedTokens(after)).toEqual(["c"]);
    expect(after.dialog).toBeUndefined();
    expect(after.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("stale-flow");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("el guardado propio admite una sola revisión y revoca si esos mismos tokens se reconfirman después", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    action.mockResolvedValueOnce({
      status: "confirmed", winnerCount: 2,
      grant: { flowToken: "own-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
    });
    await submit(render(props()));
    const saved = { ...props(), winnerRevision: "own-revision", candidates: candidates.map((candidate) => ({
      ...candidate, selected: candidate.token !== "c",
    })) };
    const accepted = render(saved);
    expect(accepted.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("own-flow");
    expect(finish).not.toHaveBeenCalled();
    const reconfirmed = { ...saved, winnerRevision: "external-reconfirmation" };
    const discarded = render(reconfirmed);
    expect(discarded.dialog).toBeUndefined();
    expect(discarded.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("own-flow");
    expect(render(saved).exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    begin.mockResolvedValueOnce({ status: "denied", message: "La selección se descartó" });
    (render(reconfirmed).table.onViewCandidate as (token: string) => void)("a");
    await Promise.resolve();
    expect(render(reconfirmed).dialog).toBeUndefined();
    expect(render(reconfirmed).status.feedback).toBe("La selección se descartó");
    expect(action).toHaveBeenCalledOnce();
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    expect(read).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("una consulta con props antiguas rechaza una transición de tokens distinta a la autorizada por begin", async () => {
    setup();
    begin.mockResolvedValueOnce({
      status: "ready", grant: { flowToken: "new-tokens-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() },
      participants: [{ token: "b", label: "Servidor" }],
    });
    await consult();
    const mismatched = render({ ...props(), winnerRevision: "revision-c", candidates: candidates.map((candidate) => ({
      ...candidate, selected: candidate.token === "c",
    })) });
    expect(mismatched.dialog).toBeUndefined();
    expect(mismatched.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("new-tokens-flow");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("conservar un ausente bloquea cambios; retirarlo permite guardado explícito sin enviar su token", async () => {
    setup();
    const overrides = { ...props(), candidates: [
      ...props().candidates,
      { token: "missing-secret", label: "Participante no disponible", participantNumber: 4, selected: true, missingResponse: true },
    ], initialRegionFilter: "Sur" };
    let view = render(overrides);
    expect([...view.table.viewableTokens as Set<string>]).not.toContain("missing-secret");
    (view.table.onViewCandidate as (token: string) => void)("missing-secret");
    expect(begin).not.toHaveBeenCalled();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    view = render(overrides);
    expect(view.footer.hasSelectionChanged).toBe(true);
    expect(view.footer.canSubmitSelection).toBe(false);
    await submit(view);
    expect(action).not.toHaveBeenCalled();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("missing-secret", false);
    await submit(render(overrides));
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect((action.mock.calls[0][0] as FormData).getAll("winnerToken")).toEqual(["a", "b"]);
  });

  it("con solo ausentes limpiar exige confirmar y envía una selección vacía", async () => {
    setup();
    const overrides = { ...props(), candidates: [
      { token: "missing-secret", label: "Participante no disponible", participantNumber: 1, selected: true, missingResponse: true },
    ] };
    const view = render(overrides);
    expect(view.controls.filteredCandidatesCount).toBe(0);
    expect(view.footer.canSubmitSelection).toBe(false);
    (view.footer.onClearSelection as () => void)();
    expect(action).not.toHaveBeenCalled();
    await submit(render(overrides));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: "Quitar ganadores" }));
    expect((action.mock.calls[0][0] as FormData).getAll("winnerToken")).toEqual([]);
  });

  it("ignora cambios locales de tokens, motivo y filtros al consultar los ganadores persistidos", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("a", false);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (view.controls.onReasonChange as (value: string) => void)("Motivo local sin guardar");
    (view.controls.onRegionFilterChange as (value: string) => void)("Sur");
    (view.table.onQueryChange as (value: string) => void)("Lu****");
    const after = await consult();
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    expect(after.dialog?.participants).toEqual([{ token: "a", label: "An****" }]);
    expect(after.dialog?.initialToken).toBe("a");
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["b"]);
    expect(after.controls.reason).toBe("Motivo local sin guardar");
    expect(after.controls.regionFilter).toBe("Sur");
    expect(after.table.query).toBe("Lu****");
    expect(after.footer.canSubmitSelection).toBe(true);
    expect(action).not.toHaveBeenCalled();
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it("cerrar el modal conserva grant y TTL y permite reabrir sin begin ni reconfirmación", async () => {
    setup();
    const opened = await consult();
    const grant = opened.dialog!.grant;
    vi.advanceTimersByTime(30_000);
    (opened.dialog!.onClose as () => void)();
    const closed = render(props());
    expect(closed.dialog).toBeUndefined();
    expect(finish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    expect(closed.footer.canSubmitSelection).toBe(false);
    expect([...closed.table.viewableTokens as Set<string>]).toEqual(["a"]);
    (closed.button("Ver datos de ganadores")!.onClick as () => void)();
    expect(render(props()).dialog!.grant).toBe(grant);
    (render(props()).dialog!.onClose as () => void)();
    const reopened = await consult();
    expect(reopened.dialog!.grant).toBe(grant);
    expect(begin).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
    expect(Swal.fire).not.toHaveBeenCalled();
    // Reabrir no extiende los dos minutos originales.
    vi.advanceTimersByTime(90_000);
    expect(render(props()).dialog).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
  });

  it.each(["Finalizar", "TTL"])("%s revoca y una consulta posterior usa begin, nunca reconfirma", async (ending) => {
    setup();
    const opened = await consult();
    if (ending === "Finalizar") opened.endReveal();
    else vi.advanceTimersByTime(120_000);
    const ended = render(props());
    expect(ended.dialog).toBeUndefined();
    expect(ended.button("Ver datos de ganadores")).toBeUndefined();
    expect([...ended.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect([...ended.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(ended.footer.canSubmitSelection).toBe(false);
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
    expect(vi.getTimerCount()).toBe(0);
    begin.mockResolvedValueOnce({ status: "ready", grant: { flowToken: "new-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() }, participants: [{ token: "a", label: "Ana" }] });
    (ended.table.onViewCandidate as (token: string) => void)("a");
    expect(render(props()).dialog).toBeUndefined();
    await Promise.resolve();
    expect(render(props()).dialog).toMatchObject({ initialToken: "a", grant: { flowToken: "new-flow" } });
    expect(begin).toHaveBeenCalledTimes(2);
    expect(action).not.toHaveBeenCalled();
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it("al volver a primer plano después del TTL oculta y revoca aunque el timer no haya corrido", async () => {
    setup();
    await consult();
    const listener = vi.mocked(document.addEventListener).mock.calls.find(([name]) => name === "visibilitychange")![1] as () => void;
    vi.setSystemTime(Date.now() + 120_000);
    listener();
    expect(render(props()).dialog).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
  });

  it("un fallo al revocar no conserva el acceso local", async () => {
    setup();
    const opened = await consult();
    finish.mockRejectedValueOnce(new Error("Sin red"));
    opened.endReveal();
    const ended = render(props());
    await Promise.resolve();
    expect(ended.dialog).toBeUndefined();
    expect(ended.button("Ver datos de ganadores")).toBeUndefined();
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
  });

  it("consultar bloquea reentrada, guardado y edición hasta recibir el permiso", async () => {
    setup();
    let resolve!: (value: Awaited<ReturnType<typeof begin>>) => void;
    begin.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const view = render(props());
    const click = view.button("Consultar ganadores guardados")!.onClick as () => Promise<void>;
    const pending = click();
    await click();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (view.footer.onClearSelection as () => void)();
    await submit(view);
    const during = render(props());
    expect(during.button("Consultando…")!.disabled).toBe(true);
    expect(during.table.isPending).toBe(true);
    expect([...during.table.selectedTokens as Set<string>]).toEqual(["a"]);
    expect(begin).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
    resolve({ status: "denied", message: "Permiso denegado" });
    await pending;
    expect(render(props()).status.feedback).toBe("Permiso denegado");
    expect(render(props()).dialog).toBeUndefined();
    expect(render(props()).table.isPending).toBe(false);
    expect(finish).not.toHaveBeenCalled();
  });

  it("un error de consulta no inventa grant ni éxito y permite reintentar", async () => {
    setup();
    begin.mockRejectedValueOnce(new Error("Sin red"));
    const failed = await consult();
    expect(failed.dialog).toBeUndefined();
    expect(failed.status.feedback).toContain("No se pudieron consultar");
    expect(failed.status.selectionNotice).toBeUndefined();
    expect(finish).not.toHaveBeenCalled();
    expect((await consult()).dialog).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("un grant que llega tras desmontar se revoca sin mostrar datos", async () => {
    setup();
    let resolve!: (value: Awaited<ReturnType<typeof begin>>) => void;
    begin.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const pending = consult();
    unmount();
    resolve({ status: "ready", grant: { flowToken: "late-saved", expiresAt: new Date(Date.now() + 120_000).toISOString() }, participants: [{ token: "a", label: "Ana" }] });
    await pending;
    expect(finish).toHaveBeenCalledExactlyOnceWith("late-saved");
    expect(vi.getTimerCount()).toBe(0);
    expect(action).not.toHaveBeenCalled();
  });

  it.each(["selección", "scope", "desmontaje"])("cambiar %s retira el permiso anterior", async (change) => {
    setup();
    const opened = await consult();
    if (change === "desmontaje") unmount();
    else if (change === "scope") render({ ...props(), exportBaseHref: "/workspaces/otro/forms/otro/responses/export" });
    else {
      (opened.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
      expect(render(props()).dialog).toBeUndefined();
    }
    expect(finish).toHaveBeenCalledExactlyOnceWith("saved-flow");
    expect(vi.getTimerCount()).toBe(0);
    expect(action).not.toHaveBeenCalled();
  });

  it("sin cambios reales no confirma ni guarda, aunque cambie el motivo, el orden o los filtros", async () => {
    const view = setup();
    (view.controls.onReasonChange as (value: string) => void)("Motivo local");
    (view.controls.onRegionFilterChange as (value: string) => void)("Sur");
    await submit(render(props()));
    expect(render(props()).footer.canSubmitSelection).toBe(false);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("a", false);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("a", true);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", false);
    await submit(render(props()));
    expect(render(props()).footer.hasSelectionChanged).toBe(false);
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(begin).not.toHaveBeenCalled();
  });

  it("un cambio real confirma y envía solo el snapshot actual, no inicia una consulta guardada", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (view.controls.onReasonChange as (value: string) => void)("Nuevo motivo");
    (view.controls.onRegionFilterChange as (value: string) => void)("Sur");
    expect(render(props()).footer.canSubmitSelection).toBe(true);
    await submit(render(props()));
    expect(Swal.fire).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    const snapshot = action.mock.calls[0][0] as FormData;
    expect(snapshot.getAll("winnerToken")).toEqual(["a", "b"]);
    expect(snapshot.get("reason")).toBe("Nuevo motivo");
    expect(snapshot.get("winnerRegionFilter")).toBe("Sur");
    expect(begin).not.toHaveBeenCalled();
  });

  it("quitar los ganadores guardados sigue requiriendo confirmación explícita", async () => {
    const view = setup();
    (view.footer.onClearSelection as () => void)();
    expect(render(props()).footer.canSubmitSelection).toBe(true);
    await submit(render(props()));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: "Quitar ganadores", confirmButtonText: "Quitar selección" }));
    expect((action.mock.calls[0][0] as FormData).getAll("winnerToken")).toEqual([]);
    expect(begin).not.toHaveBeenCalled();
  });

  it("marcar un checkbox no revela datos ni habilita lectura o exportación del borrador", () => {
    const overrides = { ...props(), candidates };
    const view = render(overrides);
    expect([...view.table.viewableTokens as Set<string>]).toEqual([]);
    expect(view.table.onViewCandidate).toEqual(expect.any(Function));
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    const selected = render(overrides);
    expect([...selected.table.selectedTokens as Set<string>]).toEqual(["b"]);
    expect(selected.footer.canSubmitSelection).toBe(true);
    expect([...selected.table.viewableTokens as Set<string>]).toEqual([]);
    expect(selected.table.onViewCandidate).toEqual(expect.any(Function));
    (selected.table.onViewCandidate as (token: string) => void)("b");
    (selected.table.onViewCandidate as (token: string) => void)("inventado");
    expect(selected.dialog).toBeUndefined();
    expect(selected.button("Ver datos de ganadores")).toBeUndefined();
    expect(selected.exports.find((button) => button.scope === "winners")).toMatchObject({ canExport: false, winnerFlowToken: undefined });
    for (const operation of [begin, read, finish, action, Swal.fire]) expect(operation).not.toHaveBeenCalled();
  });

  it("el borrador no hereda el permiso de la fila guardada al marcar otro checkbox", () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    const draft = render(props());
    expect([...draft.table.selectedTokens as Set<string>]).toEqual(["a", "b"]);
    expect([...draft.table.viewableTokens as Set<string>]).toEqual(["a"]);
    (draft.table.onViewCandidate as (token: string) => void)("b");
    const unchanged = render(props());
    expect(unchanged.dialog).toBeUndefined();
    expect(unchanged.table.isPending).toBe(false);
    for (const operation of [begin, read, finish, action, Swal.fire]) expect(operation).not.toHaveBeenCalled();
  });

  it("sustituye los persistidos antiguos por los confirmados, sin incluir el resto del borrador", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("a", false);
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    action.mockResolvedValueOnce({ status: "confirmed", winnerCount: 1, grant: {
      flowToken: "new-selection-flow", expiresAt: new Date(Date.now() + 120_000).toISOString(),
    } });
    await submit(render(props()));
    const confirmed = render(props());
    expect([...confirmed.table.viewableTokens as Set<string>]).toEqual(["b"]);
    expect([...confirmed.table.selectedTokens as Set<string>]).toEqual(["b"]);
    expect(confirmed.dialog).toBeUndefined();
    (confirmed.table.onViewCandidate as (token: string) => void)("c");
    expect(render(props()).dialog).toBeUndefined();
    (confirmed.table.onViewCandidate as (token: string) => void)("b");
    expect(render(props()).dialog).toMatchObject({ initialToken: "b", grant: { flowToken: "new-selection-flow" } });
    expect(begin).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledOnce();
  });

  it("filtrar candidatos no amplía el conjunto autorizado ni convierte candidatos en ganadores", async () => {
    setup();
    await consult();
    const overrides = props();
    (render(overrides).controls.onRegionFilterChange as (value: string) => void)("Sur");
    const filtered = render(overrides);
    expect((filtered.table.candidates as typeof candidates).map(({ token }) => token)).toEqual(["b", "c"]);
    expect([...filtered.table.viewableTokens as Set<string>]).toEqual(["a"]);
    (filtered.dialog!.onClose as () => void)();
    (render(overrides).button("Ver datos de ganadores")!.onClick as () => void)();
    expect(render(overrides).dialog?.readData).toBe(read);
    expect(render(overrides).dialog?.participants).toEqual([{ token: "a", label: "An****" }]);
    expect(render(overrides).dialog?.grant).toMatchObject({ flowToken: "saved-flow" });
    expect(finish).not.toHaveBeenCalled();
    expect(begin).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
  });

  it("exportar guardados prepara un grant sin abrir detalle ni guardar los cambios locales", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    (view.controls.onReasonChange as (value: string) => void)("Borrador no persistido");
    const before = render(props());
    expect(before.dialog).toBeUndefined();
    expect(before.exports).toHaveLength(2);
    const winners = before.exports.find((button) => button.scope === "winners")!;
    expect(winners).toMatchObject({ canExport: true, winnerFlowToken: undefined });
    const token = await (winners.requestWinnerFlowToken as () => Promise<string | undefined>)();
    expect(token).toBe("saved-flow");
    const after = render(props());
    expect(begin).toHaveBeenCalledExactlyOnceWith();
    expect(after.dialog).toBeUndefined();
    expect(after.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("saved-flow");
    expect([...after.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect([...after.table.selectedTokens as Set<string>]).toEqual(["a", "b"]);
    expect(after.controls.reason).toBe("Borrador no persistido");
    expect(after.footer.canSubmitSelection).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    for (const operation of [action, Swal.fire, read, finish]) expect(operation).not.toHaveBeenCalled();
    expect(await (after.exports.find((button) => button.scope === "winners")!.requestWinnerFlowToken as () => Promise<string | undefined>)()).toBe("saved-flow");
    expect(begin).toHaveBeenCalledOnce();
    expect(render(props()).dialog).toBeUndefined();
  });

  it.each(["denegada", "error"])("exportar con consulta %s no devuelve grant y permite reintentar sin modal", async (kind) => {
    setup();
    if (kind === "denegada") begin.mockResolvedValueOnce({ status: "denied", message: "No autorizado" });
    else begin.mockRejectedValueOnce(new Error("Sin red"));
    const request = render(props()).exports.find((button) => button.scope === "winners")!.requestWinnerFlowToken as () => Promise<string | undefined>;
    expect(await request()).toBeUndefined();
    const failed = render(props());
    expect(failed.dialog).toBeUndefined();
    expect([...failed.table.viewableTokens as Set<string>]).toEqual(["a"]);
    expect(failed.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBeUndefined();
    expect(failed.status.feedback).toBeTruthy();
    expect(await (failed.exports.find((button) => button.scope === "winners")!.requestWinnerFlowToken as () => Promise<string | undefined>)()).toBe("saved-flow");
    expect(render(props()).dialog).toBeUndefined();
    expect(action).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("clic real en exportar guardados consulta una vez y descarga sin modal, action ni reentrada", async () => {
    const view = setup();
    (view.table.onCandidateChange as (token: string, checked: boolean) => void)("b", true);
    let resolve!: (value: Awaited<ReturnType<typeof begin>>) => void;
    begin.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const button = mountExportButton(render(props()).exports.find((item) => item.scope === "winners")!);
    try {
      const pending = button.click();
      await button.click();
      expect(begin).toHaveBeenCalledExactlyOnceWith();
      expect(downloadResponsesExport).not.toHaveBeenCalled();
      expect(render(props()).dialog).toBeUndefined();
      expect(render(props()).table.isPending).toBe(true);
      resolve({ status: "ready", grant: { flowToken: "export-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() }, participants: [{ token: "a", label: "Servidor" }] });
      await pending;
      const after = render(props());
      expect(after.dialog).toBeUndefined();
      expect([...after.table.selectedTokens as Set<string>]).toEqual(["a", "b"]);
      expect([...after.table.viewableTokens as Set<string>]).toEqual(["a"]);
      expect(downloadResponsesExport).toHaveBeenCalledExactlyOnceWith(props().exportBaseHref, "winners", {
        winnerFlowToken: "export-flow", signal: expect.any(AbortSignal),
      });
      expect(action).not.toHaveBeenCalled();
      expect(Swal.fire).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
    } finally {
      button.unmount();
    }
  });

  it.each(["denegada", "error"])("clic real de exportación con consulta %s nunca descarga", async (kind) => {
    const view = setup();
    if (kind === "denegada") begin.mockResolvedValueOnce({ status: "denied", message: "Sin acceso" });
    else begin.mockRejectedValueOnce(new Error("Sin red"));
    const button = mountExportButton(view.exports.find((item) => item.scope === "winners")!);
    try {
      await button.click();
      const after = render(props());
      expect(begin).toHaveBeenCalledOnce();
      expect(downloadResponsesExport).not.toHaveBeenCalled();
      expect(after.dialog).toBeUndefined();
      expect([...after.table.viewableTokens as Set<string>]).toEqual(["a"]);
      expect(action).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
    } finally {
      button.unmount();
    }
  });

  it.each(["sin consulta", "modal abierto", "modal cerrado"])("clic real en exportar todos con %s no prepara un grant", async (state) => {
    let view = setup();
    if (state !== "sin consulta") view = await consult();
    if (state === "modal cerrado") {
      (view.dialog!.onClose as () => void)();
      view = render(props());
    }
    const beginCount = begin.mock.calls.length;
    const button = mountExportButton(view.exports.find((item) => item.scope === "participants")!);
    try {
      await button.click();
      expect(begin).toHaveBeenCalledTimes(beginCount);
      expect(downloadResponsesExport).toHaveBeenCalledExactlyOnceWith(props().exportBaseHref, "participants", {
        winnerFlowToken: undefined, signal: expect.any(AbortSignal),
      });
      expect(Boolean(render(props()).dialog)).toBe(state === "modal abierto");
      expect(action).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
    } finally {
      button.unmount();
    }
  });

  it("la toolbar permanece fuera del modal: participantes nunca recibe grant ni callback", async () => {
    const initial = setup();
    const participantsExport = initial.exports.find((button) => button.scope === "participants")!;
    expect(participantsExport).toMatchObject({ canExport: true, baseHref: props().exportBaseHref });
    expect(participantsExport).not.toHaveProperty("winnerFlowToken");
    expect(participantsExport).not.toHaveProperty("requestWinnerFlowToken");
    expect(begin).not.toHaveBeenCalled();
    const opened = await consult();
    expect(opened.exports.map((button) => button.scope)).toEqual(["participants", "winners"]);
    expect(opened.exports.find((button) => button.scope === "participants")).toEqual(participantsExport);
    (opened.dialog!.onClose as () => void)();
    const closed = render(props());
    expect(closed.exports).toHaveLength(2);
    expect(closed.exports.find((button) => button.scope === "winners")?.winnerFlowToken).toBe("saved-flow");
    expect(finish).not.toHaveBeenCalled();
  });
});