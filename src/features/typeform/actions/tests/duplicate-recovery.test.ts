import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuplicateFormResult } from "../../types/duplicate-form";

const mocks = vi.hoisted(() => ({
  getWorkspaceAccessContext: vi.fn(),
  duplicateTypeformForm: vi.fn(),
  findWorkspaceFormsByTitle: vi.fn(),
  createTypeformForm: vi.fn(),
  getTypeformForm: vi.fn(),
  resolveWorkspaceTypeformId: vi.fn(),
  formBelongsToWorkspace: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  createAuditLog: vi.fn(),
  revalidatePath: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string): never => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({
  getWorkspaceAccessContext: mocks.getWorkspaceAccessContext,
}));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  duplicateTypeformForm: mocks.duplicateTypeformForm,
  findWorkspaceFormsByTitle: mocks.findWorkspaceFormsByTitle,
  createTypeformForm: mocks.createTypeformForm,
  getTypeformForm: mocks.getTypeformForm,
  resolveWorkspaceTypeformId: mocks.resolveWorkspaceTypeformId,
  formBelongsToWorkspace: mocks.formBelongsToWorkspace,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { form: { findUnique: mocks.findUnique, upsert: mocks.upsert } },
}));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({
  createAuditLog: mocks.createAuditLog,
}));

import {
  duplicateFormAction,
  recoverDuplicatedFormAction,
} from "../duplicate-form.action";

const WORKSPACE = {
  id: "local-workspace",
  typeformId: "workspace-alias",
  name: "Workspace local",
  createdFromApp: true,
};
const USER = { id: "editor", email: "editor@example.com" };
const CANONICAL_ID = "canonical-workspace";
const SOURCE = {
  id: "source-id",
  title: "Formulario base",
  workspace: { href: `https://api.typeform.com/workspaces/${CANONICAL_ID}` },
};
const DESTINATION = {
  id: "created-id",
  title: "Título real en Typeform",
  workspace: { href: `https://api.typeform.com/workspaces/${CANONICAL_ID}` },
  self: { href: "https://api.typeform.com/forms/created-id" },
};

function data(title = "  Copia solicitada  ", skipRedirect = true) {
  const formData = new FormData();
  formData.set("title", title);
  if (skipRedirect) formData.set("_skipRedirect", "1");
  return formData;
}

function duplicate(formData = data()) {
  return duplicateFormAction(WORKSPACE.id, SOURCE.id, formData);
}

function recover() {
  return recoverDuplicatedFormAction(WORKSPACE.id, SOURCE.id, DESTINATION.id);
}

function expectRevalidated() {
  expect(mocks.revalidatePath).toHaveBeenCalledWith(
    `/workspaces/${WORKSPACE.id}/forms`,
  );
  expect(mocks.revalidatePath).toHaveBeenCalledWith(
    `/admin/workspaces/${WORKSPACE.typeformId}`,
  );
}

function expectPartial(result: DuplicateFormResult, title: string) {
  expect(result).toMatchObject({
    status: "partial",
    createdFormId: DESTINATION.id,
    title,
  });
  if (result.status === "partial") {
    expect(result.message).toMatch(/no vuelvas a crear otra copia/i);
    expect(result.message).toMatch(/recupera.*más tarde/i);
  }
  expectRevalidated();
  expect(mocks.redirect).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("Real API calls are forbidden in these tests");
  }));
  mocks.getWorkspaceAccessContext.mockResolvedValue({
    user: USER,
    workspace: WORKSPACE,
    canCreateForms: true,
  });
  mocks.duplicateTypeformForm.mockResolvedValue({
    baseForm: SOURCE,
    createdForm: DESTINATION,
  });
  mocks.findWorkspaceFormsByTitle.mockResolvedValue([]);
  mocks.getTypeformForm.mockImplementation(async (id: string) => {
    if (id === SOURCE.id) return SOURCE;
    if (id === DESTINATION.id) return DESTINATION;
    throw new Error("Unknown form");
  });
  mocks.resolveWorkspaceTypeformId.mockResolvedValue(CANONICAL_ID);
  mocks.formBelongsToWorkspace.mockImplementation(
    (form: typeof SOURCE, workspaceId: string) =>
      form.workspace?.href === `https://api.typeform.com/workspaces/${workspaceId}`,
  );
  mocks.findUnique.mockResolvedValue(null);
  mocks.upsert.mockResolvedValue({
    ...DESTINATION,
    workspaceId: WORKSPACE.id,
    typeformId: DESTINATION.id,
  });
  mocks.createAuditLog.mockResolvedValue(undefined);
});

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.createTypeformForm).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("duplicateFormAction", () => {
  it("returns explicit success when skipping redirect, trims the title and preserves local origin", async () => {
    const result: DuplicateFormResult = await duplicate();

    expect(result).toEqual({
      status: "success",
      form: { id: DESTINATION.id, title: "Copia solicitada" },
    });
    expect(mocks.getWorkspaceAccessContext).toHaveBeenCalledExactlyOnceWith(WORKSPACE.id);
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledExactlyOnceWith({
      formId: SOURCE.id,
      workspaceTypeformId: WORKSPACE.typeformId,
      title: "Copia solicitada",
    });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { typeformId: DESTINATION.id, workspaceId: WORKSPACE.id },
      create: expect.objectContaining({ workspaceId: WORKSPACE.id, title: "Copia solicitada" }),
    }));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "FORM_CLONED",
      actor: USER,
      context: expect.objectContaining({
        workspaceId: WORKSPACE.id,
        metadata: { sourceFormId: SOURCE.id, sourceFormTitle: SOURCE.title },
      }),
    }));
    expectRevalidated();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps the default redirect outside error handling", async () => {
    await expect(duplicate(data("Copia", false))).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      path: `/workspaces/${WORKSPACE.id}/forms`,
    });
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledTimes(1);
  });

  it.each(["", " \t\n "])("rejects empty trimmed titles before any remote creation (%j)", async (title) => {
    expect(await duplicate(data(title))).toMatchObject({ status: "failed", retrySafe: true });
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejects missing and non-string titles before remote creation", async () => {
    const formData = new FormData();
    expect(await duplicate(formData)).toMatchObject({ status: "failed", retrySafe: true });
    formData.set("title", new Blob(["not a title"]), "title.txt");
    expect(await duplicate(formData)).toMatchObject({ status: "failed", retrySafe: true });
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
  });

  it("returns all title conflicts, including the source, without creation, persistence or redirect", async () => {
    const matches = [
      { id: SOURCE.id, title: "COPIA   SOLICITADA" },
      { id: "other-id", title: "Copia solicitada" },
    ];
    mocks.findWorkspaceFormsByTitle.mockResolvedValue(matches);
    const result = await duplicate(data("  Copia solicitada  ", false));
    expect(result).toEqual({
      status: "name-conflict",
      message: expect.stringMatching(/confirma/i),
      matches,
    });
    expect(mocks.findWorkspaceFormsByTitle).toHaveBeenCalledExactlyOnceWith(
      WORKSPACE.typeformId, "Copia solicitada",
    );
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("allows an explicitly confirmed repeated title and preserves its original spelling", async () => {
    const matches = [{ id: SOURCE.id, title: "COPIA SOLICITADA" }];
    mocks.findWorkspaceFormsByTitle.mockResolvedValue(matches);
    const formData = data("  Copia   Solicitada  ");
    expect(await duplicate(formData)).toMatchObject({ status: "name-conflict" });
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    mocks.findWorkspaceFormsByTitle.mockClear();
    formData.set("_allowSameTitle", "1");
    expect(await duplicate(formData)).toEqual({
      status: "success", form: { id: DESTINATION.id, title: "Copia   Solicitada" },
    });
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledExactlyOnceWith({
      formId: SOURCE.id, workspaceTypeformId: WORKSPACE.typeformId,
      title: "Copia   Solicitada",
    });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it.each(["", "0", "true", "01", " 1 "])("does not treat %j as explicit confirmation", async (allow) => {
    mocks.findWorkspaceFormsByTitle.mockResolvedValue([{ id: SOURCE.id, title: "Copia solicitada" }]);
    const formData = data();
    formData.set("_allowSameTitle", allow);
    expect(await duplicate(formData)).toMatchObject({ status: "name-conflict" });
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("fails safely before creation if name verification fails, never reporting success", async () => {
    mocks.findWorkspaceFormsByTitle.mockRejectedValue(new Error("Provider unavailable"));
    expect(await duplicate(data("Copia", false))).toEqual({
      status: "failed", retrySafe: true,
      message: expect.stringMatching(/no pudimos comprobar.*no se creó/i),
    });
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("checks names before creating when there are no matches", async () => {
    expect(await duplicate()).toMatchObject({ status: "success" });
    expect(mocks.findWorkspaceFormsByTitle.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.duplicateTypeformForm.mock.invocationCallOrder[0],
    );
  });

  it("still validates titles and source membership with explicit confirmation", async () => {
    const formData = data(" ");
    formData.set("_allowSameTitle", "1");
    expect(await duplicate(formData)).toMatchObject({ status: "failed", retrySafe: true });
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    formData.set("title", "Copia");
    mocks.duplicateTypeformForm.mockResolvedValue(null);
    await expect(duplicate(formData)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not invent a title limit absent from the Create API documentation", async () => {
    const title = "a".repeat(1000);
    expect(await duplicate(data(title))).toEqual({
      status: "success", form: { id: DESTINATION.id, title },
    });
  });

  it("returns partial with the known ID if the local upsert fails, without redirect or a second creation", async () => {
    mocks.upsert.mockRejectedValue(new Error("Database unavailable"));
    expectPartial(await duplicate(data("Copia", false)), "Copia");
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledTimes(1);
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("marks a provider exception without an ID as unsafe to retry and advises checking the list", async () => {
    mocks.duplicateTypeformForm.mockRejectedValue(new Error("Timeout after POST"));
    const result = await duplicate();
    expect(result).toMatchObject({ status: "failed", retrySafe: false });
    if (result.status === "failed") {
      expect(result.message).toMatch(/revisa el listado.*antes de reintentar/i);
    }
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expectRevalidated();
  });

  it("preserves notFound for a known source outside the workspace", async () => {
    mocks.duplicateTypeformForm.mockResolvedValue(null);
    await expect(duplicate()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not report a creation failure if audit fails after persistence", async () => {
    mocks.createAuditLog.mockRejectedValue(new Error("Audit unavailable"));
    expect(await duplicate()).toMatchObject({ status: "success" });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledTimes(1);
    expectRevalidated();
  });

  it("attempts both revalidations and keeps success when cache fails", async () => {
    mocks.revalidatePath.mockImplementation(() => { throw new Error("Cache unavailable"); });
    expect(await duplicate()).toMatchObject({ status: "success" });
    expectRevalidated();
    expect(mocks.duplicateTypeformForm).toHaveBeenCalledTimes(1);
  });

  it("still redirects after persistence if audit and revalidation fail", async () => {
    mocks.createAuditLog.mockRejectedValue(new Error("Audit unavailable"));
    mocks.revalidatePath.mockImplementation(() => { throw new Error("Cache unavailable"); });
    await expect(duplicate(data("Copia", false))).rejects.toMatchObject({
      message: "NEXT_REDIRECT", path: `/workspaces/${WORKSPACE.id}/forms`,
    });
    expectRevalidated();
  });
});

describe("authorization", () => {
  it.each(["duplicate", "recover"])("rejects non-editors before remote or local writes: %s", async (action) => {
    mocks.getWorkspaceAccessContext.mockResolvedValue({ workspace: WORKSPACE, user: USER, canCreateForms: false });
    await expect(action === "duplicate" ? duplicate() : recover()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getWorkspaceAccessContext).toHaveBeenCalledExactlyOnceWith(WORKSPACE.id);
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.getTypeformForm).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceTypeformId).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not swallow access redirects", async () => {
    mocks.getWorkspaceAccessContext.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(recover()).rejects.toThrow("NEXT_REDIRECT");
    await expect(duplicate()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
    expect(mocks.getTypeformForm).not.toHaveBeenCalled();
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
  });
});

describe("recoverDuplicatedFormAction", () => {
  afterEach(() => {
    expect(mocks.duplicateTypeformForm).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("recovers existing copies without checking names even when verification would fail", async () => {
    mocks.findWorkspaceFormsByTitle.mockRejectedValue(new Error("Unavailable"));
    expect(await recover()).toMatchObject({ status: "success" });
    expect(mocks.findWorkspaceFormsByTitle).not.toHaveBeenCalled();
  });

  it("only registers an existing form, verifies both canonical memberships and trusts the remote destination title", async () => {
    expect(await recover()).toEqual({
      status: "success", form: { id: DESTINATION.id, title: DESTINATION.title },
    });
    expect(mocks.getWorkspaceAccessContext).toHaveBeenCalledExactlyOnceWith(WORKSPACE.id);
    expect(mocks.getTypeformForm).toHaveBeenCalledWith(SOURCE.id);
    expect(mocks.getTypeformForm).toHaveBeenCalledWith(DESTINATION.id);
    expect(mocks.resolveWorkspaceTypeformId).toHaveBeenCalledExactlyOnceWith(WORKSPACE.typeformId);
    expect(mocks.formBelongsToWorkspace).toHaveBeenCalledWith(SOURCE, CANONICAL_ID);
    expect(mocks.formBelongsToWorkspace).toHaveBeenCalledWith(DESTINATION, CANONICAL_ID);
    expect(mocks.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { typeformId: DESTINATION.id, workspaceId: WORKSPACE.id },
      create: {
        typeformId: DESTINATION.id,
        title: DESTINATION.title,
        selfUrl: DESTINATION.self.href,
        workspaceId: WORKSPACE.id,
      },
      update: {},
    });
    expectRevalidated();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["", DESTINATION.id],
    [SOURCE.id, " "],
    [" \n ", DESTINATION.id],
    [SOURCE.id, SOURCE.id],
    [` ${SOURCE.id} `, SOURCE.id],
  ])("rejects blank or equal IDs before remote reads: %j, %j", async (sourceId, createdId) => {
    expect(await recoverDuplicatedFormAction(WORKSPACE.id, sourceId, createdId))
      .toMatchObject({ status: "failed", retrySafe: true });
    expect(mocks.getWorkspaceAccessContext).toHaveBeenCalledTimes(1);
    expect(mocks.getTypeformForm).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceTypeformId).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it.each(["source", "destination"])("rejects foreign %s forms", async (foreign) => {
    mocks.getTypeformForm.mockImplementation(async (id: string) => {
      const form = id === SOURCE.id ? SOURCE : DESTINATION;
      if (id === (foreign === "source" ? SOURCE.id : DESTINATION.id)) {
        return { ...form, workspace: { href: "https://api.typeform.com/workspaces/foreign" } };
      }
      return form;
    });
    await expect(recover()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejects an already registered foreign local form without reassigning it", async () => {
    mocks.findUnique.mockResolvedValue({ typeformId: DESTINATION.id, workspaceId: "foreign-local-workspace" });
    await expect(recover()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("also rejects a concurrent foreign registration and scopes the upsert to prevent reassignment", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ workspaceId: "foreign" });
    mocks.upsert.mockRejectedValue(new Error("Unique typeformId constraint"));
    await expect(recover()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { typeformId: DESTINATION.id, workspaceId: WORKSPACE.id },
      update: {},
    }));
  });

  it.each(["source", "destination", "workspace"])("returns partial with the same ID and a safe title when %s fetching fails temporarily", async (stage) => {
    if (stage === "workspace") {
      mocks.resolveWorkspaceTypeformId.mockRejectedValue(new Error("Timeout"));
    } else {
      mocks.getTypeformForm.mockImplementation(async (id: string) => {
        if (id === (stage === "source" ? SOURCE.id : DESTINATION.id)) throw new Error("Timeout");
        return id === SOURCE.id ? SOURCE : DESTINATION;
      });
    }
    expectPartial(await recover(), "Formulario creado");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns partial if the local registration lookup is unavailable", async () => {
    mocks.findUnique.mockRejectedValue(new Error("Database unavailable"));
    expectPartial(await recover(), DESTINATION.title);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns partial if registration fails, retaining the trusted destination title", async () => {
    mocks.upsert.mockRejectedValue(new Error("Database unavailable"));
    expectPartial(await recover(), DESTINATION.title);
  });

  it("can finish a partial duplication without making another remote copy", async () => {
    mocks.upsert.mockRejectedValueOnce(new Error("Database unavailable"));
    expectPartial(await duplicate(), "Copia solicitada");
    mocks.duplicateTypeformForm.mockClear();
    expect(await recover()).toEqual({
      status: "success", form: { id: DESTINATION.id, title: DESTINATION.title },
    });
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
  });

  it("is idempotent and preserves an existing local title and description", async () => {
    const local = {
      typeformId: DESTINATION.id,
      workspaceId: WORKSPACE.id,
      title: "Título local conservado",
      description: "Descripción local conservada",
      selfUrl: "https://local.example/form",
    };
    const original = { ...local };
    mocks.findUnique.mockResolvedValue(local);
    mocks.upsert.mockImplementation(async ({ update }) => {
      Object.assign(local, update);
      return local;
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      expect(await recover()).toMatchObject({ status: "success" });
    }
    expect(local).toEqual(original);
    expect(mocks.getWorkspaceAccessContext).toHaveBeenCalledTimes(2);
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    for (const [args] of mocks.upsert.mock.calls) {
      expect(args.update).toEqual({});
      expect(args.where).toEqual({ typeformId: DESTINATION.id, workspaceId: WORKSPACE.id });
    }
  });

  it("is idempotent starting from an unregistered remote form", async () => {
    let local: { typeformId: string; workspaceId: string; title: string } | null = null;
    let inserts = 0;
    mocks.findUnique.mockImplementation(async () => local);
    mocks.upsert.mockImplementation(async ({ create, update }) => {
      if (!local) {
        local = { ...create };
        inserts++;
      } else {
        Object.assign(local, update);
      }
      return local;
    });
    expect(await recover()).toMatchObject({ status: "success" });
    expect(await recover()).toMatchObject({ status: "success" });
    expect(inserts).toBe(1);
    expect(local).toMatchObject({ workspaceId: WORKSPACE.id, title: DESTINATION.title });
  });

  it("keeps success if revalidation fails after local recovery", async () => {
    mocks.revalidatePath.mockImplementation(() => { throw new Error("Cache unavailable"); });
    expect(await recover()).toMatchObject({ status: "success" });
    expectRevalidated();
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
});