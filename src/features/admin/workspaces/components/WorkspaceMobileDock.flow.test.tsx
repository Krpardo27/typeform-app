import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(), effects: [] as Array<() => (() => void)>,
  summaryFocus: vi.fn(), contains: vi.fn(),
  details: { open: true, contains: vi.fn(), querySelector: vi.fn() },
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: () => ({ current: mocks.details }),
  useId: () => "dock-test",
  useEffect: (effect: () => (() => void)) => { mocks.effects.push(effect); },
}));
vi.mock("next/navigation", () => ({ usePathname: mocks.pathname }));
vi.mock("@/shared/components/LogoutButton", () => ({ LogoutButton: () => null }));

import { WorkspaceMobileDock } from "./WorkspaceMobileDock";

class TestNode {}

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function render() {
  return nodes(WorkspaceMobileDock({ workspaces: [{ id: "radio", name: "Radio" }, { id: "otra", name: "Otra radio" }], currentWorkspaceId: "radio" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effects.length = 0;
  mocks.details.open = true;
  mocks.details.contains.mockReturnValue(false);
  mocks.details.querySelector.mockReturnValue({ focus: mocks.summaryFocus });
  mocks.pathname.mockReturnValue("/workspaces/radio/forms");
});
afterEach(() => vi.unstubAllGlobals());

describe("comportamiento del menú móvil con eventos simulados", () => {
  it("usa pointerdown para cerrar al tocar fuera y limpia el listener", () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("document", { addEventListener: add, removeEventListener: remove });
    vi.stubGlobal("Node", TestNode);
    render();
    const cleanup = mocks.effects[0]();
    expect(add).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    const outside = add.mock.calls[0][1] as (event: { target: TestNode }) => void;
    outside({ target: new TestNode() });
    expect(mocks.details.open).toBe(false);
    mocks.details.open = true;
    mocks.details.contains.mockReturnValue(true);
    outside({ target: new TestNode() });
    expect(mocks.details.open).toBe(true);
    cleanup();
    expect(remove).toHaveBeenCalledWith("pointerdown", outside);
  });

  it("Escape cierra y devuelve el foco al resumen, sin interferir con composición de texto", () => {
    const details = render().find((element) => element.type === "details")!;
    const onKeyDown = details.props.onKeyDown as (event: { key: string; nativeEvent: { isComposing: boolean }; preventDefault: () => void }) => void;
    const preventDefault = vi.fn();
    onKeyDown({ key: "Escape", nativeEvent: { isComposing: true }, preventDefault });
    expect(mocks.details.open).toBe(true);
    onKeyDown({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault });
    expect(mocks.details.open).toBe(false);
    expect(mocks.summaryFocus).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("tocar Tus radios no cierra el selector cuando el texto no recibe foco", () => {
    const elements = render();
    const heading = elements.find((element) => element.type === "p" && element.props.children === "Tus radios")!;
    expect(heading).toBeDefined();
    expect(heading.props.href).toBeUndefined();
    const details = elements.find((element) => element.type === "details")!;
    const onBlur = details.props.onBlur as (event: { currentTarget: { contains: (target: unknown) => boolean }; relatedTarget: unknown }) => void;
    onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
    expect(mocks.details.open).toBe(true);
    expect(mocks.summaryFocus).not.toHaveBeenCalled();
  });

  it("salir con el foco cierra el selector, sin cerrarlo al moverse dentro", () => {
    const details = render().find((element) => element.type === "details")!;
    const onBlur = details.props.onBlur as (event: { currentTarget: { contains: (target: unknown) => boolean }; relatedTarget: unknown }) => void;
    onBlur({ currentTarget: { contains: () => true }, relatedTarget: {} });
    expect(mocks.details.open).toBe(true);
    onBlur({ currentTarget: { contains: () => false }, relatedTarget: {} });
    expect(mocks.details.open).toBe(false);
  });

  it("bloquea solo la página exacta, permite volver al listado y conserva nuevas pestañas", () => {
    const preventDefault = vi.fn();
    const link = render().find((element) => element.props.href === "/workspaces/radio/forms")!;
    (link.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(link.props.onClick).toBeUndefined();
    expect(mocks.details.open).toBe(false);

    mocks.pathname.mockReturnValue("/workspaces/radio/forms/form/responses");
    preventDefault.mockClear();
    const parentLink = render().find((element) => element.props.href === "/workspaces/radio/forms")!;
    (parentLink.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("cerrar la radio actual solo cancela la navegación si ya se está en su inicio", () => {
    mocks.pathname.mockReturnValue("/workspaces/radio");
    const menuLink = render().filter((element) => element.props.href === "/workspaces/radio").at(-1)!;
    const preventDefault = vi.fn();
    (menuLink.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.details.open).toBe(false);
    expect(mocks.summaryFocus).toHaveBeenCalledOnce();

    mocks.pathname.mockReturnValue("/workspaces/radio/forms");
    preventDefault.mockClear();
    const homeLink = render().filter((element) => element.props.href === "/workspaces/radio").at(-1)!;
    (homeLink.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("cambia la clave del menú para que una navegación externa no lo deje abierto", () => {
    const before = render().find((element) => element.type === "details")!;
    mocks.pathname.mockReturnValue("/workspaces/radio/forms/nuevo");
    const after = render().find((element) => element.type === "details")!;
    expect(before.key).not.toBe(after.key);
  });
});