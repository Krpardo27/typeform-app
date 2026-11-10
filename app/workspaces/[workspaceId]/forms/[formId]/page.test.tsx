import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  form: vi.fn(),
  resolveWorkspace: vi.fn(),
  belongsToWorkspace: vi.fn(),
  isNotFound: vi.fn(),
  panel: vi.fn(() => <section>Duplicar formulario</section>),
  notFound: vi.fn((): never => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((path: string): never => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({
  getWorkspaceAccessContext: mocks.access,
}));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  getTypeformForm: mocks.form,
  resolveWorkspaceTypeformId: mocks.resolveWorkspace,
  formBelongsToWorkspace: mocks.belongsToWorkspace,
  isTypeformNotFoundError: mocks.isNotFound,
}));
vi.mock("@/features/typeform/components/creation/DuplicateFormPanel", () => ({
  DuplicateFormPanel: mocks.panel,
}));
vi.mock("../new/page", () => ({ default: () => <h1>Nuevo formulario</h1> }));

import WorkspaceFormDetailPage from "./page";
import NewWorkspaceFormPage from "../new/page";
import WorkspaceFormDetailLoading from "./loading";

const workspace = { id: "workspace-local", name: "Radio de prueba", typeformId: "workspace-remoto" };
const form = { id: "form-canonico", title: "Concurso de prueba", _links: { display: "https://example.com/concurso" } };

async function renderPage(searchParams: { clonedFrom?: string } = {}) {
  return WorkspaceFormDetailPage({
    params: Promise.resolve({ workspaceId: "workspace-ruta", formId: "form-ruta" }),
    searchParams: Promise.resolve(searchParams),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({ workspace, canCreateForms: true });
  mocks.form.mockResolvedValue(form);
  mocks.resolveWorkspace.mockResolvedValue("workspace-canonico");
  mocks.belongsToWorkspace.mockReturnValue(true);
  mocks.isNotFound.mockReturnValue(false);
});

describe("WorkspaceFormDetailPage", () => {
  it.each([true, false])("redirige a respuestas con IDs canónicos sin vista intermedia con canCreateForms=%s", async (canCreateForms) => {
    mocks.access.mockResolvedValue({ workspace, canCreateForms });
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/workspaces/workspace-local/forms/form-canonico/responses");

    expect(mocks.panel).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/workspaces/workspace-local/forms/form-canonico/responses");
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith("workspace-ruta");
    expect(mocks.form).toHaveBeenCalledExactlyOnceWith("form-ruta");
    expect(mocks.resolveWorkspace).toHaveBeenCalledExactlyOnceWith("workspace-remoto");
    expect(mocks.belongsToWorkspace).toHaveBeenCalledExactlyOnceWith(form, "workspace-canonico");
  });

  it("los enlaces antiguos de clonación llegan a respuestas sin parámetros de la vista retirada", async () => {
    await expect(renderPage({ clonedFrom: "form-origen" })).rejects.toThrow("NEXT_REDIRECT:/workspaces/workspace-local/forms/form-canonico/responses");
    expect(mocks.redirect).toHaveBeenCalledWith("/workspaces/workspace-local/forms/form-canonico/responses");
    expect(mocks.panel).not.toHaveBeenCalled();
  });

  it("codifica los segmentos autorizados sin permitir destinos externos ni query inyectada", async () => {
    mocks.access.mockResolvedValue({ workspace: { ...workspace, id: "radio/uno?x=1" } });
    mocks.form.mockResolvedValue({ ...form, id: "form#dos /?" });
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/workspaces/radio%2Funo%3Fx%3D1/forms/form%23dos%20%2F%3F/responses");
  });

  it("no consulta ni redirige cuando la autorización rechaza el acceso", async () => {
    mocks.access.mockRejectedValue(new Error("Acceso denegado"));
    await expect(renderPage()).rejects.toThrow("Acceso denegado");
    expect(mocks.form).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rechaza un formulario que no pertenece al workspace", async () => {
    mocks.belongsToWorkspace.mockReturnValue(false);

    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.panel).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("mantiene notFound cuando Typeform no encuentra el formulario", async () => {
    mocks.form.mockRejectedValue(new Error("Formulario ausente"));
    mocks.isNotFound.mockReturnValue(true);

    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.resolveWorkspace).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("propaga errores de Typeform distintos de notFound", async () => {
    mocks.form.mockRejectedValue(new Error("Fallo temporal"));

    await expect(renderPage()).rejects.toThrow("Fallo temporal");
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("delega new sin alterar la página responsable del permiso de creación ni su paginación", async () => {
    const page = await WorkspaceFormDetailPage({
      params: Promise.resolve({ workspaceId: "workspace-ruta", formId: "new" }),
      searchParams: Promise.resolve({ page: "2", pageSize: "24" }),
    });

    expect(isValidElement(page)).toBe(true);
    expect(page.type).toBe(NewWorkspaceFormPage);
    await expect(page.props.params).resolves.toEqual({ workspaceId: "workspace-ruta" });
    await expect(page.props.searchParams).resolves.toEqual({ page: "2", pageSize: "24" });
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.form).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("la espera de la ruta antigua no simula integración ni duplicación retiradas", () => {
    const html = renderToStaticMarkup(<WorkspaceFormDetailLoading />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Abriendo respuestas del formulario");
    expect(html).not.toContain("animate-pulse");
    expect(html).not.toContain("<article");
  });
});