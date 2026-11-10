import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WinnerDataDialog } from "./WinnerDataDialog";
import { ResponseExportButton } from "../ResponseExportButton";
import type { WinnerDetailResult } from "@/features/typeform/types/winner-reveal";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }>,
  effects: [] as Array<() => void>,
}));

// Renderer de eventos para el entorno node del proyecto. Los efectos se
// ejecutan DESPUÉS de conectar refs; no se simulan lecturas ni validaciones.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useId: () => "detail-test",
  useState: <T,>(initial: T | (() => T)) => {
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
    if (!slot.deps || deps.some((value, index) => !Object.is(value, slot.deps![index]))) {
      hooks.effects.push(() => {
        slot.cleanup?.();
        slot.deps = deps;
        slot.cleanup = effect() ?? undefined;
      });
    }
  },
}));
vi.mock("react-dom", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-dom")>(),
  createPortal: (children: ReactNode) => children,
}));
vi.mock("../ResponseExportButton", () => ({ ResponseExportButton: () => <button type="button">Exportar selección confirmada</button> }));

type Props = ComponentProps<typeof WinnerDataDialog>;
const readData = vi.fn<Props["readData"]>();
const onClose = vi.fn();
const participants = [{ token: "a", label: "Ana" }, { token: "b", label: "Luis" }];
const formRef = { current: null };
let grant: Props["grant"];
const focus = vi.fn();
const previousFocus = { isConnected: true, focus: vi.fn() };
const nativeDialog = {
  open: false,
  showModal: vi.fn(() => { nativeDialog.open = true; }),
  close: vi.fn(() => { nativeDialog.open = false; }),
  getBoundingClientRect: () => ({ left: 10, right: 100, top: 10, bottom: 100 }),
};

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function render(overrides: Partial<Props> = {}) {
  hooks.cursor = 0;
  const tree = WinnerDataDialog({ grant, participants, initialToken: "a", readData, onClose, selectionFormRef: formRef, ...overrides });
  const elements = nodes(tree);
  const dialog = elements.find((element) => element.type === "dialog")!.props;
  (dialog.ref as { current: unknown }).current = nativeDialog;
  const close = elements.find((element) => element.type === "button" && String(element.props["aria-label"]).startsWith("Cerrar datos"))!.props;
  (close.ref as { current: unknown }).current = { focus };
  for (const effect of hooks.effects.splice(0)) effect();
  return {
    dialog, close, elements,
    html: () => renderToStaticMarkup(tree),
    button: (label: string) => elements.find((element) => element.type === "button" && element.props["aria-label"] === label)!.props,
    export: elements.find((element) => element.type === ResponseExportButton)?.props,
  };
}

function unmount() {
  for (const slot of hooks.slots) {
    slot.cleanup?.();
    slot.cleanup = undefined;
  }
}

function revealed(token = "a"): Extract<WinnerDetailResult, { status: "revealed" }> {
  return {
    status: "revealed", expiresAt: new Date(Date.now() + 120_000).toISOString(), contact: "ana@example.test",
    response: {
      token, visibility: "winner", submittedAt: "2026-11-01T12:00:00Z", landedAt: "2026-11-01T11:55:00Z",
      answers: [
        { id: "answer-1", fieldLabel: "Nombres", question: "Ab7xQ9mLp2", value: "Mi respuesta concreta", masked: false },
        { id: "answer-2", question: "<script>Pregunta</script>", value: "<img src=x onerror=alert(1)>", masked: false },
      ],
      hidden: [{ id: "hidden", question: "SECRETO OCULTO", value: "NO MOSTRAR", masked: false }],
    },
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.effects = [];
  grant = { flowToken: "winner-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() };
  nativeDialog.open = false;
  nativeDialog.showModal.mockImplementation(() => { nativeDialog.open = true; });
  nativeDialog.close.mockImplementation(() => { nativeDialog.open = false; });
  previousFocus.isConnected = true;
  vi.stubGlobal("HTMLElement", Object);
  vi.stubGlobal("document", { activeElement: previousFocus, body: { style: { overflow: "auto" } } });
  readData.mockResolvedValue(revealed());
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("detalle exclusivo de ganadores con grant obligatorio", () => {
  it("consulta únicamente con el grant y navega entre los ganadores autorizados", async () => {
    readData.mockResolvedValueOnce(revealed("b"));
    const first = render({ initialToken: "b" });
    expect(readData).toHaveBeenCalledExactlyOnceWith("winner-flow", "b");
    expect(first.dialog["aria-busy"]).toBe(true);
    expect(first.html()).toContain("Datos del ganador");
    expect(first.dialog["aria-describedby"]).toBeUndefined();
    expect(first.close["aria-label"]).toBe("Cerrar datos del ganador");
    expect(first.button("Ganador siguiente").disabled).toBe(true);
    readData.mockResolvedValue(revealed("a"));
    (first.button("Ganador anterior").onClick as () => void)();
    render();
    await settle();
    expect(readData).toHaveBeenLastCalledWith("winner-flow", "a");
    expect(render().html()).toContain("Mi respuesta concreta");
    expect(render().export).toBeUndefined();
  });

  it("con grant usa el token autorizado y solo exporta la selección confirmada", async () => {
    const grant = { flowToken: "winner-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() };
    const overrides = { grant, exportBaseHref: "/export" };
    render(overrides);
    await settle();
    const loaded = render(overrides);
    expect(readData).toHaveBeenCalledExactlyOnceWith("winner-flow", "a");
    expect(loaded.close["aria-label"]).toBe("Cerrar datos del ganador");
    expect(loaded.html()).toContain("Datos del ganador");
    expect(loaded.button("Ganador anterior").disabled).toBe(true);
    expect(loaded.export).toMatchObject({ baseHref: "/export", scope: "winners", canExport: true, winnerFlowToken: "winner-flow" });
  });

  it("el encabezado solo muestra la X a la derecha y no reutiliza el nombre enmascarado", async () => {
    const result = revealed();
    result.response.answers = [{ id: "name", fieldLabel: "Nombres", question: "Nombres", value: "Kevin Pérez Soto", masked: false }];
    readData.mockResolvedValueOnce(result);
    const overrides = { participants: [{ token: "a", label: "Ke****" }] };
    const pending = render(overrides);
    const header = pending.elements.find((element) => element.type === "header")!;
    const headerElements = nodes(header);
    const heading = headerElements.find((element) => element.type === "h2")!;
    expect(header.props.className).toContain("justify-end");
    expect(heading.props).toMatchObject({ id: "detail-test-title", className: "sr-only", children: "Datos del ganador" });
    expect(headerElements.filter((element) => element.type === "button")).toHaveLength(1);
    expect(pending.html()).not.toContain("Ke****");
    expect(pending.html()).not.toContain("Kevin Pérez Soto");
    await settle();
    const loaded = render(overrides);
    expect(loaded.html()).toContain("Kevin Pérez Soto");
    expect(loaded.html()).not.toContain("Ke****");
    expect(loaded.dialog["aria-labelledby"]).toBe(heading.props.id);
    (loaded.close.onClick as () => void)();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("no ofrece exportación sin una URL, incluso con datos autorizados", async () => {
    render();
    await settle();
    expect(render().export).toBeUndefined();
  });

  it("muestra etiqueta y valor en dl/dt/dd compacto, escapa HTML y omite IDs, preguntas opacas y hidden", async () => {
    render();
    await settle();
    const loaded = render();
    const list = loaded.elements.filter((element) => element.type === "dl")[1];
    expect(nodes(list).filter((element) => element.type === "dt").map((element) => element.props.children))
      .toEqual(["Nombres", "Respuesta 2"]);
    expect(nodes(list).filter((element) => element.type === "dd").map((element) => element.props.children))
      .toEqual(["Mi respuesta concreta", "<img src=x onerror=alert(1)>"]);
    const html = loaded.html();
    expect(html).not.toContain("Ab7xQ9mLp2");
    expect(html).not.toContain("Pregunta");
    expect(html).not.toContain("answer-1");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("SECRETO OCULTO");
    expect(html).not.toContain("NO MOSTRAR");
    expect(html).toContain("ana@example.test");
    expect(html).toContain("UTC");
    expect(loaded.dialog["aria-busy"]).toBe(false);
  });

  it("muestra las ocho etiquetas reales del DTO y solo usa id como key de React", async () => {
    const result = revealed();
    const labels = ["Nombres", "Primer apellido", "Segundo apellido", "RUT:", "Correo electrónico", "Teléfono", "Región", "Comuna"];
    result.response.answers = labels.map((fieldLabel, index) => ({
      id: `private-field-${index}`, fieldLabel, question: `opaque_question_${index}`, value: `valor-${index}`, masked: false,
    }));
    readData.mockResolvedValueOnce(result);
    render();
    await settle();
    const loaded = render();
    const list = loaded.elements.filter((element) => element.type === "dl")[1];
    expect(nodes(list).filter((element) => element.type === "dt").map((element) => element.props.children)).toEqual(labels);
    expect(loaded.html()).not.toContain("private-field-");
    expect(loaded.html()).not.toContain("opaque_question_");
  });

  it("tampoco usa hidden como contacto implícito cuando no hay contacto autorizado", async () => {
    const result = revealed();
    delete result.contact;
    result.response.hidden = [{ id: "hidden-email", question: "correo", value: "hidden@example.test", masked: false }];
    readData.mockResolvedValueOnce(result);
    render();
    await settle();
    const html = render().html();
    expect(html).toContain("Sin email visible");
    expect(html).not.toContain("hidden@example.test");
    expect(html).not.toContain("hidden-email");
  });

  it("acepta question legible legacy, pero jamás IDs ni refs opacas ni metadatos inseguros", async () => {
    const result = revealed();
    const questions = ["¿Por qué quieres participar?", "6d6f4b98-94aa-4b5c-993a-61e63f2a2287", "Ab7xQ9mLp2", "opaque_question", "kjhgfdsasdf", ""];
    result.response.answers = questions.map((question, index) => ({
      id: "Nombres", question, ...(index === 3 ? { fieldLabel: "field_Ab7xQ9mLp2" } : {}), value: `dato-${index}`, masked: false,
    }));
    readData.mockResolvedValueOnce(result);
    render();
    await settle();
    const loaded = render();
    const list = loaded.elements.filter((element) => element.type === "dl")[1];
    expect(nodes(list).filter((element) => element.type === "dt").map((element) => element.props.children))
      .toEqual([questions[0], "Respuesta 2", "Respuesta 3", "Respuesta 4", "Respuesta 5", "Respuesta 6"]);
    for (const opaque of [...questions.slice(1, -1), "field_Ab7xQ9mLp2", "Nombres"]) expect(loaded.html()).not.toContain(opaque);
  });

  it.each(["token ajeno", "anónimo"])("rechaza un resultado revelado con %s sin filtrar respuestas ni contacto", async (kind) => {
    const result = revealed();
    if (kind === "token ajeno") result.response.token = "otro";
    else result.response.visibility = "anonymous";
    readData.mockResolvedValueOnce(result);
    render();
    await settle();
    const loaded = render();
    expect(loaded.html()).toContain('role="alert"');
    expect(loaded.html()).toContain("No se pudo verificar");
    expect(loaded.html()).not.toContain("Mi respuesta concreta");
    expect(loaded.html()).not.toContain("ana@example.test");
    expect(loaded.export).toBeUndefined();
  });

  it("una denegación se muestra como alerta sin datos ni exportación", async () => {
    readData.mockResolvedValueOnce({ status: "denied", message: "Permiso caducado" });
    const overrides = { grant: { flowToken: "flow", expiresAt: new Date(Date.now() + 120_000).toISOString() }, exportBaseHref: "/export" };
    render(overrides);
    await settle();
    const loaded = render(overrides);
    expect(loaded.html()).toContain('role="alert"');
    expect(loaded.html()).toContain("Permiso caducado");
    expect(loaded.html()).not.toContain("Mi respuesta concreta");
    expect(loaded.export).toBeUndefined();
  });

  it("un fallo de lectura se puede reintentar cerrando y reabriendo, sin datos anteriores", async () => {
    readData.mockRejectedValueOnce(new Error("Sin red"));
    render();
    await settle();
    expect(render().html()).toContain("Ciérralo y vuelve a intentarlo");
    (render().close.onClick as () => void)();
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    hooks.slots = [];
    render();
    await settle();
    expect(render().html()).toContain("Mi respuesta concreta");
    expect(readData).toHaveBeenCalledTimes(2);
  });

  it("navegar oculta inmediatamente la respuesta anterior y descarta lecturas tardías", async () => {
    let resolve!: (result: WinnerDetailResult) => void;
    readData.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const first = render();
    readData.mockResolvedValueOnce({ ...revealed("b"), contact: "luis@example.test" });
    (first.button("Ganador siguiente").onClick as () => void)();
    const pending = render();
    expect(pending.html()).not.toContain("Mi respuesta concreta");
    expect(pending.dialog["aria-busy"]).toBe(true);
    await settle();
    expect(render().html()).toContain("luis@example.test");
    resolve(revealed("a"));
    await settle();
    expect(render().html()).toContain("luis@example.test");
    expect(render().html()).not.toContain("ana@example.test");
    expect(readData.mock.calls).toEqual([["winner-flow", "a"], ["winner-flow", "b"]]);
  });

  it("no reutiliza los datos ya cargados al pasar de un participante al siguiente", async () => {
    render();
    await settle();
    const loaded = render();
    expect(loaded.html()).toContain("ana@example.test");
    readData.mockReturnValueOnce(new Promise(() => {}));
    (loaded.button("Ganador siguiente").onClick as () => void)();
    const pending = render();
    expect(pending.html()).not.toContain("ana@example.test");
    expect(pending.html()).not.toContain("Mi respuesta concreta");
    expect(pending.html()).toContain("Consultando datos autorizados");
  });

  it("ignora un detalle recibido después de caducar el grant", async () => {
    let resolve!: (result: WinnerDetailResult) => void;
    readData.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const overrides = { grant: { flowToken: "flow", expiresAt: new Date(Date.now() + 120_000).toISOString() } };
    render(overrides);
    vi.advanceTimersByTime(120_000);
    resolve(revealed());
    await settle();
    expect(render(overrides).html()).not.toContain("Mi respuesta concreta");
    expect(render(overrides).html()).not.toContain("ana@example.test");
  });

  it.each(["caducado", "fecha inválida", "token vacío", "ausente"])("no consulta ni revela datos con grant %s", async (kind) => {
    const invalidGrant = kind === "ausente" ? undefined : {
      flowToken: kind === "token vacío" ? " " : "flow",
      expiresAt: kind === "fecha inválida" ? "inválida" : new Date(Date.now() - 1).toISOString(),
    };
    if (kind === "token vacío") invalidGrant!.expiresAt = new Date(Date.now() + 120_000).toISOString();
    const overrides = { grant: invalidGrant as Props["grant"], exportBaseHref: "/export" };
    render(overrides);
    await settle();
    const loaded = render(overrides);
    expect(readData).not.toHaveBeenCalled();
    expect(loaded.html()).toContain('role="alert"');
    expect(loaded.html()).not.toContain("ana@example.test");
    expect(loaded.export).toBeUndefined();
  });

  it.each(["grant", "detalle"])("retira datos ya cargados y exportación al caducar el %s", async (kind) => {
    const detail = revealed();
    if (kind === "detalle") detail.expiresAt = new Date(Date.now() + 30_000).toISOString();
    readData.mockResolvedValueOnce(detail);
    const overrides = { exportBaseHref: "/export" };
    render(overrides);
    await settle();
    expect(render(overrides).html()).toContain("ana@example.test");
    vi.advanceTimersByTime(kind === "detalle" ? 30_000 : 120_000);
    const loaded = render(overrides);
    expect(loaded.html()).toContain("ha caducado");
    expect(loaded.html()).not.toContain("ana@example.test");
    expect(loaded.html()).not.toContain("Mi respuesta concreta");
    expect(loaded.html()).not.toContain("Nombres");
    expect(loaded.export).toBeUndefined();
  });

  it.each(["fecha inválida", "caducado"])("rechaza un detalle con plazo %s aunque el grant siga vigente", async (kind) => {
    const detail = revealed();
    detail.expiresAt = kind === "fecha inválida" ? "inválida" : new Date(Date.now()).toISOString();
    readData.mockResolvedValueOnce(detail);
    render();
    await settle();
    const loaded = render();
    expect(loaded.html()).toContain("No se pudo verificar");
    expect(loaded.html()).not.toContain("ana@example.test");
    expect(loaded.html()).not.toContain("Nombres");
  });

  it("desmontar descarta la lectura pendiente y restaura scroll y foco", async () => {
    let resolve!: (result: WinnerDetailResult) => void;
    readData.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render();
    expect(nativeDialog.showModal).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(nativeDialog.close).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe("auto");
    expect(previousFocus.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    resolve(revealed());
    await settle();
    expect(hooks.slots.some((slot) => (slot.value as { result?: unknown } | null)?.result)).toBe(false);
  });

  it("botón, cancel y Escape cierran; Escape en composición no lo hace", () => {
    const view = render();
    (view.close.onClick as () => void)();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    (view.dialog.onCancel as (event: unknown) => void)({ preventDefault });
    const keyDown = view.dialog.onKeyDown as (event: unknown) => void;
    keyDown({ key: "Escape", nativeEvent: { isComposing: true }, preventDefault, stopPropagation });
    expect(onClose).toHaveBeenCalledTimes(2);
    keyDown({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault, stopPropagation });
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(view.dialog["aria-labelledby"]).toBe("detail-test-title");
    expect(view.dialog["aria-describedby"]).toBeUndefined();
  });
});