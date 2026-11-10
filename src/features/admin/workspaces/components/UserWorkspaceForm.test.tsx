import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserWorkspaceForm } from "./UserWorkspaceForm";

const mocks = vi.hoisted(() => ({
  scenario: "unchanged" as "unchanged" | "edited" | "review" | "pending",
  arrayStateIndex: 0,
  update: vi.fn(),
  selector: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      let value = initial;
      const edited = [{ workspaceId: "radio", role: "VIEWER" }];
      if (Array.isArray(initial) && ++mocks.arrayStateIndex === 2 && mocks.scenario !== "unchanged") value = edited;
      if (initial === null && (mocks.scenario === "review" || mocks.scenario === "pending")) value = edited;
      return actual.useState(value);
    },
    useTransition: () => [mocks.scenario === "pending", vi.fn()],
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions/update-user-workspaces", () => ({ updateUserWorkspaces: mocks.update }));
vi.mock("./WorkspaceAccessSelector", () => ({ WorkspaceAccessSelector: (props: unknown) => { mocks.selector(props); return null; } }));

function render(workspaces = [{ id: "radio", name: "Radio", typeformId: "remote" }], assignedWorkspaces: { workspaceId: string; role: "VIEWER" | "EDITOR" }[] = []) {
  return renderToStaticMarkup(<UserWorkspaceForm
    userId="user"
    workspaces={workspaces}
    assignedWorkspaces={assignedWorkspaces}
  />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scenario = "unchanged";
  mocks.arrayStateIndex = 0;
});

describe("pie adaptable de UserWorkspaceForm", () => {
  it("mantiene dos columnas móviles y una fila sin salto en escritorio", () => {
    mocks.scenario = "edited";
    const html = render();
    expect(html).toContain("grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-nowrap");
    expect(html).toContain("sm:flex-row sm:items-center sm:justify-between");
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html).toContain("Descartar cambios");
    expect(html).toContain("Guardar permisos");
    for (const button of html.match(/<button\b[^>]*>/g)!) {
      expect(button).toContain("min-h-11 min-w-0");
      expect(button).toContain("justify-center");
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("al revisar conserva Volver y Confirmar en la misma cuadrícula", () => {
    mocks.scenario = "review";
    const html = render();
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html).toContain("Volver a editar");
    expect(html).toContain("Confirmar cambios");
    expect(html).toContain("min-w-0 wrap-anywhere");
    expect(html).not.toContain("Descartar cambios");
    expect(html).not.toContain("col-span-2");
  });

  it("sin cambios el único botón ocupa las dos columnas móviles", () => {
    const html = render();
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html.match(/<button\b[^>]*>/)![0]).toContain("col-span-2");
    expect(html.match(/<button\b[^>]*>/)![0]).toContain('disabled=""');
  });

  it("mantiene ambos botones deshabilitados y el texto adaptable al guardar", () => {
    mocks.scenario = "pending";
    const html = render();
    expect(html.match(/<button\b/g)).toHaveLength(2);
    for (const button of html.match(/<button\b[^>]*>/g)!) expect(button).toContain('disabled=""');
    expect(html).toContain("Guardando…");
    expect(html).toContain("size-4 shrink-0 animate-spin motion-reduce:animate-none");
  });

  it("no cuenta ni ofrece asignaciones históricas que ya no están en el catálogo disponible", () => {
    const html = render([], [{ workspaceId: "retirada", role: "EDITOR" }]);
    expect(mocks.selector).toHaveBeenCalledWith(expect.objectContaining({ workspaces: [], assignments: [] }));
    expect(html).toContain("0 workspaces seleccionados");
    expect(html).toContain("Sin cambios pendientes");
    expect(html.match(/<button\b[^>]*>/)![0]).toContain('disabled=""');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("si desaparece un workspace de la revisión exige revisar de nuevo en lugar de ocultar el cambio", () => {
    mocks.scenario = "review";
    const html = render([]);
    expect(html).toContain('role="alert"');
    expect(html).toContain("La disponibilidad de los workspaces cambió");
    expect(mocks.selector).toHaveBeenCalledWith(expect.objectContaining({ assignments: [] }));
    expect(mocks.update).not.toHaveBeenCalled();
  });
});