import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  createDefaultTypeformFormForWorkspace: vi.fn(),
  duplicateTypeformForm: vi.fn(),
  getWorkspaceAccessContext: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { path });
    throw error;
  }),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({
  getWorkspaceAccessContext: mocks.getWorkspaceAccessContext,
}));

vi.mock("@/features/typeform/services/typeform.service", () => ({
  createDefaultTypeformFormForWorkspace:
    mocks.createDefaultTypeformFormForWorkspace,
  duplicateTypeformForm: mocks.duplicateTypeformForm,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    form: {
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("@/features/admin/audit/services/audit-log.service", () => ({
  createAuditLog: mocks.createAuditLog,
}));

import { createDefaultFormForWorkspaceAction } from "../create-default-form-for-workspace.action";
import { duplicateFormAction } from "../duplicate-form.action";

const WORKSPACE = {
  id: "workspace-db-id",
  name: "Workspace Demo",
  typeformId: "typeform-workspace-id",
};

const USER = {
  id: "user-id",
  email: "editor@example.com",
};

const CREATED_FORM = {
  id: "created-form-id",
  title: "Formulario duplicado",
  self: {
    href: "https://api.typeform.com/forms/created-form-id",
  },
};

function expectRedirectToFormsList(error: unknown) {
  expect(error).toMatchObject({
    message: "NEXT_REDIRECT",
    path: `/workspaces/${WORKSPACE.id}/forms`,
  });
}

describe("form action redirection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TYPEFORM_BASE_FORM_ID = "base-form-id";

    mocks.getWorkspaceAccessContext.mockResolvedValue({
      user: USER,
      workspace: WORKSPACE,
      canCreateForms: true,
    });
    mocks.upsert.mockResolvedValue({});
    mocks.createAuditLog.mockResolvedValue(undefined);
  });

  it("redirects duplicated forms back to the workspace forms list", async () => {
    mocks.duplicateTypeformForm.mockResolvedValue({
      baseForm: {
        id: "source-form-id",
        title: "Formulario base",
      },
      createdForm: CREATED_FORM,
    });

    const formData = new FormData();
    formData.set("title", "Formulario duplicado");

    await duplicateFormAction(WORKSPACE.id, "source-form-id", formData).catch(
      expectRedirectToFormsList,
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      `/workspaces/${WORKSPACE.id}/forms`,
    );
    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining(`/forms/${CREATED_FORM.id}`),
    );
  });

  it("redirects default form creation back to the workspace forms list", async () => {
    mocks.createDefaultTypeformFormForWorkspace.mockResolvedValue({
      baseForm: {
        id: "base-form-id",
        title: "Formulario base original",
      },
      createdForm: CREATED_FORM,
    });

    await createDefaultFormForWorkspaceAction(WORKSPACE.id).catch(
      expectRedirectToFormsList,
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      `/workspaces/${WORKSPACE.id}/forms`,
    );
    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining(`/forms/${CREATED_FORM.id}`),
    );
  });
});
