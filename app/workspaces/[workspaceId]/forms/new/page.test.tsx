import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewWorkspaceFormPage from "./page";

const mocks = vi.hoisted(() => ({ access: vi.fn(), forms: vi.fn(), createDefault: vi.fn(), duplicate: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({ getWorkspaceAccessContext: mocks.access }));
vi.mock("@/features/typeform/services/typeform.service", () => ({ getWorkspaceForms: mocks.forms }));
vi.mock("@/features/typeform/actions/create-default-form-for-workspace.action", () => ({ createDefaultFormForWorkspaceAction: mocks.createDefault }));
vi.mock("@/features/typeform/components/forms/WorkspaceFormDuplicateButton", () => ({
  WorkspaceFormDuplicateButton: (props: { label: string; formTitle: string }) => {
    mocks.duplicate(props);
    return <button type="button" aria-label={`${props.label}: ${props.formTitle}`}>{props.label}</button>;
  },
}));
vi.mock("@/features/typeform/components/creation/EmptyBaseFormsState", () => ({ EmptyBaseFormsState: () => <p>Sin formularios base</p> }));
vi.mock("@/shared/components/Pagination", () => ({ default: () => <nav aria-label="Paginación" /> }));

const workspace = { id: "local-authorized", name: "Radio", typeformId: "remote" };
const input = { params: Promise.resolve({ workspaceId: "requested" }), searchParams: Promise.resolve({ page: "2", pageSize: "24" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ workspace, canCreateForms: true });
  mocks.forms.mockResolvedValue({ items: [{ id: "base", title: "Concurso" }], total_items: 25, page_count: 2 });
});

describe("selector de formularios base: autorización y retorno", () => {
  it("comprueba permisos antes de cargar u ofrecer bases para duplicar", async () => {
    mocks.access.mockResolvedValueOnce({ workspace, canCreateForms: false });
    await expect(NewWorkspaceFormPage(input)).rejects.toThrow("NOT_FOUND");
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith("requested");
    expect(mocks.forms).not.toHaveBeenCalled();
    expect(mocks.duplicate).not.toHaveBeenCalled();
    expect(mocks.createDefault).not.toHaveBeenCalled();
  });

  it("usa el workspace autorizado en los botones y conserva el regreso al listado", async () => {
    const html = renderToStaticMarkup(await NewWorkspaceFormPage(input));
    expect(mocks.forms).toHaveBeenCalledExactlyOnceWith("remote", { page: 2, pageSize: 24 });
    expect(mocks.duplicate).toHaveBeenCalledExactlyOnceWith({ workspaceId: "local-authorized", formId: "base", formTitle: "Concurso", label: "Usar como base" });
    expect(html).toContain('href="/workspaces/local-authorized/forms"');
    expect(html).toContain("Volver a formularios");
    expect(html).toContain("Usar como base");
    expect(html).not.toContain('href="/workspaces/local-authorized/forms/base"');
    expect(html).not.toContain("/responses");
    expect(mocks.createDefault).not.toHaveBeenCalled();
  });

  it("mantiene el estado vacío sin ofrecer una base inexistente", async () => {
    mocks.forms.mockResolvedValueOnce({ items: [], total_items: 0, page_count: 0 });
    const html = renderToStaticMarkup(await NewWorkspaceFormPage(input));
    expect(html).toContain("Sin formularios base");
    expect(mocks.duplicate).not.toHaveBeenCalled();
  });
});