import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceFormDuplicateButton } from "./WorkspaceFormDuplicateButton";
import DuplicateFormDialog, { type DuplicateFormDialogProps } from "./DuplicateFormDialog";
import { BaseFormsGrid } from "../creation/BaseFormsGrid";

const mocks = vi.hoisted(() => ({
  cursor: 0, slots: [] as Array<{ value: unknown }>,
  create: vi.fn(), recover: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = mocks.slots[mocks.cursor++] ??= { value: initial };
    return [slot.value, (next: unknown) => { slot.value = next; }];
  },
  useRef: (initial: unknown) => {
    const slot = mocks.slots[mocks.cursor++] ??= { value: { current: initial } };
    return slot.value;
  },
  useEffect: () => {},
  useTransition: () => [false, (task: () => Promise<void>) => { void task(); }],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("./WorkspaceFormsGridLoadingGate", () => ({ useWorkspaceFormsGridOperation: () => null }));
vi.mock("@/features/typeform/actions/duplicate-form.action", () => ({
  duplicateFormAction: mocks.create, recoverDuplicatedFormAction: mocks.recover,
}));

function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node as ReactElement<Record<string, unknown>>, ...Children.toArray(node.props.children).flatMap(nodes)];
}

type Props = ComponentProps<typeof WorkspaceFormDuplicateButton>;
const props: Props = { workspaceId: "radio /", formId: "base-form", formTitle: "Concurso" };
const recoveryKey = "duplicate-recovery:radio /:base-form";
const storage = new Map<string, string>();

function render(overrides: Partial<Props> = {}) {
  mocks.cursor = 0;
  return nodes(WorkspaceFormDuplicateButton({ ...props, ...overrides }));
}
function button(overrides: Partial<Props> = {}) {
  return render(overrides).find((node) => node.type === "button")!;
}
function open(overrides: Partial<Props> = {}) {
  (button(overrides).props.onClick as () => void)();
  return dialog();
}
function dialog() {
  return render().find((node) => node.type === DuplicateFormDialog)!.props as unknown as DuplicateFormDialogProps;
}

function expectListReturn() {
  expect(mocks.replace).toHaveBeenCalledOnce();
  const destination = new URL(mocks.replace.mock.calls[0][0], "https://example.test");
  expect(destination.pathname).toBe("/workspaces/radio%20%2F/forms");
  expect([...destination.searchParams.entries()].sort()).toEqual([["page", "1"], ["pageSize", "24"]]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.slots = [];
  storage.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("window", { location: { pathname: "/workspaces/radio%20%2F/forms/new", search: "?page=4&pageSize=24" } });
  mocks.create.mockResolvedValue({ status: "success", form: { id: "copy", title: "Nueva copia" } });
  mocks.recover.mockResolvedValue({ status: "success", form: { id: "copy", title: "Nueva copia" } });
});
afterEach(() => vi.unstubAllGlobals());

describe("duplicación desde tarjetas y selector", () => {
  it("la variante predeterminada conserva icono, nombre accesible y tamaño", () => {
    const control = button();
    expect(control.props).toMatchObject({ type: "button", title: "Duplicar formulario", "aria-label": "Duplicar Concurso", "aria-haspopup": "dialog", disabled: false });
    expect(control.props.className).toContain("size-11");
    expect(nodes(control).some((node) => node.type === "span")).toBe(false);
    expect(control.props.children).toBeTruthy();
  });

  it("cada base usa el botón existente con texto visible, sin enlaces intermedios", () => {
    const elements = nodes(BaseFormsGrid({ workspaceId: props.workspaceId, forms: [{ id: "base-form", title: "  Concurso  " }, { id: "empty", title: " " }] }));
    expect(elements.filter((node) => node.type === "article")).toHaveLength(2);
    expect(elements.some((node) => node.props.href)).toBe(false);
    const controls = elements.filter((node) => node.type === WorkspaceFormDuplicateButton);
    expect(controls.map((node) => node.props)).toEqual([
      { ...props, label: "Usar como base" },
      { workspaceId: props.workspaceId, formId: "empty", formTitle: "Formulario sin título", label: "Usar como base" },
    ]);
    const control = button(controls[0].props as Props);
    expect(control.props["aria-label"]).toBe("Usar como base: Concurso");
    expect(nodes(control).find((node) => node.type === "span")!.props.children).toBe("Usar como base");
    expect(control.props.className).toContain("w-full");
  });

  it("abrir el selector no crea nada hasta confirmar; crea con la acción existente y vuelve al listado", async () => {
    const panel = open({ label: "Usar como base" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(button().props.disabled).toBe(true);
    await panel.onSubmit("Nueva copia", false);
    const [workspaceId, formId, data] = mocks.create.mock.calls[0] as [string, string, FormData];
    expect([workspaceId, formId]).toEqual([props.workspaceId, props.formId]);
    expect([...data.entries()]).toEqual([["title", "Nueva copia"], ["_skipRedirect", "1"]]);
    expectListReturn();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(render().some((node) => node.type === DuplicateFormDialog)).toBe(false);
  });

  it("cancelar no duplica ni navega y permite abrir de nuevo", () => {
    open({ label: "Usar como base" }).onClose();
    expect(button().props.disabled).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(open().initialRecovery).toBeNull();
  });

  it("una copia parcial se recupera sin crear otra, incluso tras remontar el selector", async () => {
    mocks.create.mockResolvedValueOnce({ status: "partial", createdFormId: "copy", title: "Nueva copia", message: "Pendiente" });
    await open({ label: "Usar como base" }).onSubmit("Nueva copia", false);
    expect(storage.has(recoveryKey)).toBe(true);
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.slots = [];
    const recoveredPanel = open({ label: "Usar como base" });
    expect(recoveredPanel.initialRecovery).toEqual({ createdFormId: "copy", title: "Nueva copia" });
    await recoveredPanel.onSubmit("Nueva copia", false);
    expect(mocks.recover).toHaveBeenCalledExactlyOnceWith(props.workspaceId, props.formId, "copy");
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(storage.has(recoveryKey)).toBe(false);
    expectListReturn();
  });

  it("mantiene el aviso de resultado incierto al reabrir sin navegar", async () => {
    mocks.create.mockRejectedValueOnce(new Error("Conexión interrumpida"));
    expect(await open().onSubmit("Nueva copia", false)).toMatchObject({ status: "failed", retrySafe: false });
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.slots = [];
    expect(open({ label: "Usar como base" }).initialUncertain).toBe(true);
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("el selector vacío no ofrece controles de duplicación", () => {
    const elements = nodes(BaseFormsGrid({ workspaceId: props.workspaceId, forms: [] }));
    expect(elements.some((node) => node.type === WorkspaceFormDuplicateButton)).toBe(false);
    expect(elements.find((node) => node.type === "h2")!.props.children).toBe("No hay formularios base disponibles");
  });
});