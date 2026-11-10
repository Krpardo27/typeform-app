import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMobileMoreMenu } from "./AdminMobileMoreMenu";

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void)>,
  summaryFocus: vi.fn(),
  details: { open: true, contains: vi.fn(), querySelector: vi.fn() },
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: () => ({ current: mocks.details }),
  useId: () => "admin-more-test",
  useEffect: (effect: () => (() => void)) => { mocks.effects.push(effect); },
}));

class TestNode {}

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function render(pathname = "/admin/users") {
  return nodes(AdminMobileMoreMenu({ pathname }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effects.length = 0;
  mocks.details.open = true;
  mocks.details.contains.mockReturnValue(false);
  mocks.details.querySelector.mockReturnValue({ focus: mocks.summaryFocus });
});
afterEach(() => vi.unstubAllGlobals());

describe("menú Más de administración", () => {
  it("usa details nativo, controles asociados y un menú anclado al ancho del dock", () => {
    const elements = render();
    expect(elements[0].type).toBe("details");
    expect(elements[0].props.open).toBeUndefined();
    const summary = elements.find((element) => element.type === "summary")!;
    const nav = elements.find((element) => element.type === "nav")!;
    expect(summary.props["aria-controls"]).toBe(nav.props.id);
    expect(summary.props["aria-label"]).toBe("Más opciones de administración");
    expect(nav.props.className).toContain("absolute inset-x-0 bottom-full");
  });

  it.each(["/admin/miembros", "/admin/miembros/nuevo", "/admin/auditoria", "/admin/auditoria/evento"])("marca Más y el destino correcto para %s", (path) => {
    const elements = render(path);
    expect(elements.find((element) => element.type === "summary")?.props.className).toContain("bg-[#FFF1EB]");
    const active = elements.filter((element) => element.props["aria-current"]);
    expect(active).toHaveLength(1);
    expect(active[0].props["aria-current"]).toBe(path.split("/").length === 3 ? "page" : "location");
  });

  it("no activa Más por un prefijo ajeno", () => {
    expect(render("/admin/auditoria-otra").find((element) => element.type === "summary")?.props.className).not.toContain("bg-[#FFF1EB]");
  });

  it("cierra al pulsar fuera y limpia el listener", () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("document", { addEventListener: add, removeEventListener: remove });
    vi.stubGlobal("Node", TestNode);
    render();
    const cleanup = mocks.effects[0]();
    const outside = add.mock.calls[0][1] as (event: { target: TestNode }) => void;
    expect(add).toHaveBeenCalledWith("pointerdown", outside);
    mocks.details.contains.mockReturnValue(true);
    outside({ target: new TestNode() });
    expect(mocks.details.open).toBe(true);
    mocks.details.contains.mockReturnValue(false);
    outside({ target: new TestNode() });
    expect(mocks.details.open).toBe(false);
    cleanup();
    expect(remove).toHaveBeenCalledWith("pointerdown", outside);
  });

  it("Escape cierra y restaura foco sin interferir con composición", () => {
    const onKeyDown = render()[0].props.onKeyDown as (event: { key: string; nativeEvent: { isComposing: boolean }; preventDefault: () => void }) => void;
    const preventDefault = vi.fn();
    onKeyDown({ key: "Escape", nativeEvent: { isComposing: true }, preventDefault });
    expect(mocks.details.open).toBe(true);
    onKeyDown({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault });
    expect(mocks.details.open).toBe(false);
    expect(mocks.summaryFocus).toHaveBeenCalledOnce();
  });

  it("no se cierra al pulsar texto sin foco ni al moverse dentro, pero sí al salir con Tab", () => {
    const onBlur = render()[0].props.onBlur as (event: { currentTarget: { contains: (target: unknown) => boolean }; relatedTarget: unknown }) => void;
    onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
    expect(mocks.details.open).toBe(true);
    onBlur({ currentTarget: { contains: () => true }, relatedTarget: {} });
    expect(mocks.details.open).toBe(true);
    onBlur({ currentTarget: { contains: () => false }, relatedTarget: {} });
    expect(mocks.details.open).toBe(false);
  });

  it("bloquea solo la ruta exacta y conserva navegación desde detalles anidados", () => {
    const preventDefault = vi.fn();
    const current = render("/admin/miembros").find((element) => element.props.href === "/admin/miembros")!;
    (current.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.details.open).toBe(false);
    expect(mocks.summaryFocus).toHaveBeenCalledOnce();
    expect(current.props.onClick).toBeUndefined();

    preventDefault.mockClear();
    const parent = render("/admin/miembros/nuevo").find((element) => element.props.href === "/admin/miembros")!;
    (parent.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});