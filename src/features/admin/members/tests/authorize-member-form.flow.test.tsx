import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizeMemberForm } from "../components/AuthorizeMemberForm";
import { WorkspaceAccessSelector, type WorkspaceAccessOption, type WorkspaceAccessAssignment } from "@/features/admin/workspaces/components/WorkspaceAccessSelector";

const mocks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }>,
  effects: [] as Array<() => void>,
  pending: false,
  tasks: [] as Promise<void>[],
  action: vi.fn(), refresh: vi.fn(), success: vi.fn(), error: vi.fn(), rethrow: vi.fn(),
  emailFocus: vi.fn(), reviewFocus: vi.fn(),
}));

// Harness de eventos con estado y refs persistentes. Las interacciones DOM
// (foco real, teclado y doble clic) se comprueban aparte en el navegador.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useId: () => "authorize-test",
  useState: <T,>(initial: T | (() => T)) => {
    const slot = mocks.slots[mocks.cursor++] ??= { value: typeof initial === "function" ? (initial as () => T)() : initial };
    return [slot.value, (next: T | ((previous: T) => T)) => {
      slot.value = typeof next === "function" ? (next as (previous: T) => T)(slot.value as T) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = mocks.slots[mocks.cursor++] ??= { value: { current: initial } };
    return slot.value;
  },
  useEffect: (effect: () => void | (() => void), deps: readonly unknown[]) => {
    const slot = mocks.slots[mocks.cursor++] ??= {};
    if (!slot.deps || deps.some((value, index) => !Object.is(value, slot.deps![index]))) {
      slot.deps = deps;
      mocks.effects.push(() => { slot.cleanup?.(); slot.cleanup = effect() ?? undefined; });
    }
  },
  useTransition: () => [mocks.pending, (callback: () => Promise<void>) => {
    mocks.pending = true;
    mocks.tasks.push(callback().finally(() => { mocks.pending = false; }));
  }],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }), unstable_rethrow: mocks.rethrow }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("../actions/authorize-member.action", () => ({ authorizeMemberBatch: mocks.action }));

const catalog: WorkspaceAccessOption[] = [
  { id: "a", name: "Radio A", typeformId: "remote-a" },
  { id: "b", name: "Radio B", typeformId: "remote-b" },
];

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function text(element: ReactNode): string {
  if (typeof element === "string" || typeof element === "number") return String(element);
  if (!isValidElement<{ children?: ReactNode }>(element)) return "";
  return Children.toArray(element.props.children).map(text).join("");
}

function render(workspaces = catalog) {
  mocks.cursor = 0;
  const elements = nodes(AuthorizeMemberForm({ workspaces }));
  const form = elements[0];
  const email = elements.find((element) => element.type === "input" && element.props.name === "email")!;
  const selector = elements.find((element) => element.type === WorkspaceAccessSelector)!;
  const heading = elements.find((element) => element.type === "h3")!;
  (email.props.ref as { current: unknown }).current = { focus: mocks.emailFocus };
  if (heading) (heading.props.ref as { current: unknown }).current = { focus: mocks.reviewFocus };
  for (const effect of mocks.effects.splice(0)) effect();
  const submit = elements.find((element) => element.type === "button" && element.props.type === "submit")!;
  const back = elements.find((element) => element.type === "button" && element.props.type === "button");
  return {
    form, email, selector, submit, back,
    reviewing: Boolean(heading),
    alerts: elements.filter((element) => element.props.role === "alert").map(text).join(" "),
    status: elements.filter((element) => element.props.role === "status").map(text).join(" "),
    setEmail: (value: string) => (email.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } }),
    toggle: selector.props.onToggleWorkspace as (id: string) => void,
    role: selector.props.onRoleChange as (id: string, role: "VIEWER" | "EDITOR") => void,
    clear: selector.props.onClear as () => void,
    query: selector.props.onQueryChange as (value: string) => void,
    send: (intent: string | null = String(submit.props.value)) => {
      (form.props.onSubmit as (event: { preventDefault: () => void; nativeEvent: { submitter: { getAttribute: () => string } | null } }) => void)({
        preventDefault: vi.fn(),
        nativeEvent: { submitter: intent === null ? null : { getAttribute: () => intent } },
      });
    },
    edit: () => (back!.props.onClick as () => void)(),
  };
}

function prepare(workspaces = catalog) {
  const view = render(workspaces);
  view.setEmail("  MEMBER@Example.TEST  ");
  view.toggle("a");
  return render(workspaces);
}

async function settle() { await Promise.all(mocks.tasks); }

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cursor = 0;
  mocks.slots = [];
  mocks.effects = [];
  mocks.tasks = [];
  mocks.pending = false;
  mocks.action.mockResolvedValue({ success: true, message: "Miembro autorizado" });
});
afterEach(() => { for (const slot of mocks.slots) slot.cleanup?.(); });

describe("AuthorizeMemberForm: revisión y autorización", () => {
  it("valida correo y asignaciones sin llamar a la acción ni revisar datos inválidos", () => {
    render().send();
    const invalid = render();
    expect(invalid.reviewing).toBe(false);
    expect(invalid.email.props["aria-invalid"]).toBe(true);
    expect(invalid.alerts).toContain("Ingresa un correo electrónico válido");
    expect(invalid.alerts).toContain("Selecciona al menos un workspace");
    expect(mocks.emailFocus).toHaveBeenCalledOnce();
    expect(mocks.action).not.toHaveBeenCalled();
    invalid.setEmail("member@example.test");
    expect(render().email.props["aria-invalid"]).toBe(false);
    expect(render().alerts).toBe("");
  });

  it("normaliza el correo y revisa los roles sin escribir en servidor", () => {
    const before = prepare();
    before.role("a", "EDITOR");
    render().send();
    const review = render();
    expect(review.reviewing).toBe(true);
    expect(review.email.props.value).toBe("member@example.test");
    expect(review.selector.props.assignments).toEqual([{ workspaceId: "a", role: "EDITOR" }]);
    expect(review.selector.props.disabled).toBe(true);
    expect(mocks.reviewFocus).toHaveBeenCalledOnce();
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("Volver conserva correo, roles y búsqueda, y restaura foco sin guardar", () => {
    const before = prepare();
    before.role("a", "EDITOR");
    before.query("Radio A");
    render().send();
    render().edit();
    const editing = render();
    expect(editing.reviewing).toBe(false);
    expect(editing.email.props.value).toBe("member@example.test");
    expect(editing.selector.props.assignments).toEqual([{ workspaceId: "a", role: "EDITOR" }]);
    expect(editing.selector.props.query).toBe("Radio A");
    expect(mocks.emailFocus).toHaveBeenCalledOnce();
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("una segunda activación residual de Revisar no se interpreta como Confirmar", () => {
    const editing = prepare();
    const reviewKey = editing.submit.key;
    editing.send("review");
    const review = render();
    expect(review.submit.key).not.toBe(reviewKey);
    review.send("review");
    review.send(null);
    expect(mocks.action).not.toHaveBeenCalled();
    expect(render().reviewing).toBe(true);
  });

  it("un evento antiguo de Confirmar después de volver a editar tampoco autoriza", () => {
    prepare().send();
    render().edit();
    const editing = render();
    editing.send("confirm");
    expect(render().reviewing).toBe(false);
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("permite revisar mediante envío implícito desde el campo de correo", () => {
    prepare().send(null);
    expect(render().reviewing).toBe(true);
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("la confirmación envía una copia normalizada del snapshot y limpia el formulario al completar", async () => {
    const editing = prepare();
    editing.role("a", "EDITOR");
    editing.query("Radio A");
    render().send();
    const review = render();
    const previousAssignments = review.selector.props.assignments;
    review.setEmail("changed@example.test");
    review.toggle("b");
    review.role("a", "VIEWER");
    review.clear();
    review.send();
    await settle();
    const after = render();
    expect(mocks.action).toHaveBeenCalledExactlyOnceWith({ email: "member@example.test", assignments: [{ workspaceId: "a", role: "EDITOR" }] });
    expect(mocks.action.mock.calls[0][0].assignments).not.toBe(previousAssignments);
    expect(after.reviewing).toBe(false);
    expect(after.email.props.value).toBe("");
    expect(after.selector.props.assignments).toEqual([]);
    expect(after.selector.props.query).toBe("");
    expect(after.status).toBe("Miembro autorizado");
    expect(mocks.success).toHaveBeenCalledWith("Miembro autorizado");
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.emailFocus).toHaveBeenCalledOnce();
  });

  it("bloquea doble confirmación, edición y vuelta durante una petición", async () => {
    let resolve!: (value: { success: boolean; message: string }) => void;
    mocks.action.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    prepare().send();
    const review = render();
    review.send();
    review.send();
    review.edit();
    review.setEmail("otro@example.test");
    review.toggle("b");
    const pending = render();
    expect(mocks.action).toHaveBeenCalledOnce();
    expect(pending.form.props["aria-busy"]).toBe(true);
    expect(pending.submit.props.disabled).toBe(true);
    expect(pending.back?.props.disabled).toBe(true);
    expect(pending.selector.props.disabled).toBe(true);
    expect(pending.email.props.value).toBe("member@example.test");
    expect(pending.reviewing).toBe(true);
    expect(mocks.reviewFocus).toHaveBeenCalledOnce();
    resolve({ success: true, message: "Guardado" });
    await settle();
    expect(render().form.props["aria-busy"]).toBe(false);
  });

  it("un rechazo esperado conserva la revisión y permite reintentar sin robar foco", async () => {
    mocks.action.mockResolvedValueOnce({ success: false, message: "No autorizado" });
    prepare().send();
    render().send();
    render();
    await settle();
    const failed = render();
    expect(failed.reviewing).toBe(true);
    expect(failed.alerts).toBe("No autorizado");
    expect(failed.email.props.value).toBe("member@example.test");
    expect(mocks.error).toHaveBeenCalledWith("No autorizado");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.reviewFocus).toHaveBeenCalledOnce();
    expect(mocks.emailFocus).not.toHaveBeenCalled();
    failed.send();
    await settle();
    expect(mocks.action).toHaveBeenCalledTimes(2);
    expect(render().status).toBe("Miembro autorizado");
  });

  it("un error inesperado advierte del resultado incierto y conserva el snapshot", async () => {
    const error = new Error("Conexión interrumpida");
    mocks.action.mockRejectedValueOnce(error);
    prepare().send();
    render().send();
    await settle();
    const failed = render();
    expect(mocks.rethrow).toHaveBeenCalledWith(error);
    expect(failed.reviewing).toBe(true);
    expect(failed.alerts).toContain("Revisa los accesos del miembro antes de volver a intentarlo");
    expect(failed.email.props.value).toBe("member@example.test");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("relanza errores de control de Next sin inventar un error de autorización", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    mocks.rethrow.mockImplementationOnce(() => { throw redirect; });
    mocks.action.mockRejectedValueOnce(redirect);
    prepare().send();
    render().send();
    await expect(settle()).rejects.toBe(redirect);
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    // El finally debe liberar también la guarda síncrona.
    render().send();
    await mocks.tasks[1];
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });

  it("muestra solo selecciones disponibles y pide nueva revisión si el catálogo cambia antes de revisar", () => {
    prepare().toggle("b");
    const changedCatalog = catalog.slice(0, 1);
    const changed = render(changedCatalog);
    expect(changed.selector.props.assignments).toEqual([{ workspaceId: "a", role: "VIEWER" }]);
    expect(changed.alerts).toContain("ya no están disponibles");
    changed.send();
    const editing = render(changedCatalog);
    expect(editing.reviewing).toBe(false);
    expect(editing.alerts).toContain("Se conservaron los accesos disponibles");
    expect(editing.selector.props.assignments).toEqual([{ workspaceId: "a", role: "VIEWER" }]);
    editing.send();
    expect(render(changedCatalog).reviewing).toBe(true);
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("revalida al confirmar y nunca envía IDs retirados después de revisar", async () => {
    prepare().toggle("b");
    render().send();
    const changedCatalog = catalog.slice(0, 1);
    render(changedCatalog).send();
    expect(mocks.action).not.toHaveBeenCalled();
    expect(render(changedCatalog).reviewing).toBe(false);
    render(changedCatalog).send();
    render(changedCatalog).send();
    await settle();
    expect(mocks.action).toHaveBeenCalledExactlyOnceWith({ email: "member@example.test", assignments: [{ workspaceId: "a", role: "VIEWER" }] });
  });

  it("una nueva referencia del catálogo con los mismos IDs no borra borrador ni revisión", () => {
    prepare().send();
    const replaced = render(catalog.map((workspace) => ({ ...workspace })));
    expect(replaced.reviewing).toBe(true);
    expect(replaced.email.props.value).toBe("member@example.test");
    expect(replaced.selector.props.assignments).toEqual([{ workspaceId: "a", role: "VIEWER" }]);
    expect(mocks.reviewFocus).toHaveBeenCalledOnce();
  });

  it.each(["role", "clear", "email"] as const)("corregir %s limpia un error de selección obsoleta", (edit) => {
    prepare().toggle("b");
    const changedCatalog = catalog.slice(0, 1);
    render(changedCatalog).send();
    const editing = render(changedCatalog);
    if (edit === "role") editing.role("a", "EDITOR");
    if (edit === "clear") editing.clear();
    if (edit === "email") editing.setEmail("otra@example.test");
    expect(render(changedCatalog).alerts).toBe("");
  });

  it("sin catálogo no permite enviar ni incorporar un ID desconocido", () => {
    const empty = render([]);
    empty.toggle("desconocido");
    const after = render([]);
    expect(after.selector.props.assignments).toEqual([]);
    expect(after.submit.props.disabled).toBe(true);
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("mantiene asociación accesible del correo y las acciones en dos columnas al revisar", () => {
    const editing = prepare();
    expect(editing.email.props.type).toBe("email");
    expect(editing.email.props.autoComplete).toBe("email");
    expect(editing.email.props.required).toBe(true);
    expect(editing.email.props["aria-describedby"]).toBe("authorize-test-email-hint");
    editing.send();
    const review = render();
    const selected = review.selector.props.assignments as WorkspaceAccessAssignment[];
    expect(selected).toHaveLength(1);
    expect(review.submit.props.name).toBe("intent");
    expect(review.submit.props.value).toBe("confirm");
    expect(review.submit.props.className).toContain("min-h-11 min-w-0");
    expect(review.back?.props.className).toContain("min-h-11 min-w-0");
    const grids = nodes(review.form).filter((element) => String(element.props.className).includes("grid-cols-2"));
    expect(grids).toHaveLength(1);
  });
});