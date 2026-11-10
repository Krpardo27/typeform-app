"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import {
  duplicateTypeformForm,
  findWorkspaceFormsByTitle,
  formBelongsToWorkspace,
  getTypeformForm,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import type { DuplicateFormResult } from "@/features/typeform/types/duplicate-form";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { getWorkspaceFormsListPath } from "@/features/typeform/utils/form-redirect";

type Workspace = { id: string; typeformId: string };

function revalidateForms(workspace: Workspace) {
  for (const path of [
    `/workspaces/${workspace.id}/forms`,
    `/admin/workspaces/${workspace.typeformId}`,
  ]) {
    try {
      revalidatePath(path);
    } catch (error) {
      // Cache failure must not turn an existing copy into a creation failure.
      console.error("[DUPLICATE_FORM] Failed to revalidate forms", error);
    }
  }
}

function pendingRegistration(
  workspace: Workspace,
  createdFormId: string,
  title: string,
): DuplicateFormResult {
  revalidateForms(workspace);
  return {
    status: "partial",
    createdFormId,
    title,
    message:
      "El formulario ya existe en Typeform. No vuelvas a crear otra copia; recupera su registro para completarlo más tarde.",
  };
}

export async function duplicateFormAction(
  workspaceId: string,
  sourceFormId: string,
  formData: FormData,
): Promise<DuplicateFormResult> {
  const { user, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const rawTitle = formData.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (!title) {
    return {
      status: "failed",
      message: "Debes ingresar un nombre para el formulario duplicado",
      retrySafe: true,
    };
  }

  // Explicit confirmation permits legitimate repeated titles. The duplicate
  // service still checks source membership before creating the remote copy.
  if (formData.get("_allowSameTitle") !== "1") {
    let matches: Awaited<ReturnType<typeof findWorkspaceFormsByTitle>>;
    try {
      matches = await findWorkspaceFormsByTitle(workspace.typeformId, title);
    } catch {
      return {
        status: "failed",
        message:
          "No pudimos comprobar el nombre del formulario. No se creó ninguna copia; vuelve a intentarlo.",
        retrySafe: true,
      };
    }
    if (matches.length > 0) {
      return {
        status: "name-conflict",
        message:
          "Ya existen formularios con este nombre en el workspace. Confirma si deseas crear otra copia con el mismo nombre.",
        matches,
      };
    }
  }

  // Create API documents no maximum length for the form's title:
  // https://www.typeform.com/developers/create/reference/create-form/
  let duplicated: Awaited<ReturnType<typeof duplicateTypeformForm>>;
  try {
    duplicated = await duplicateTypeformForm({
      formId: sourceFormId,
      workspaceTypeformId: workspace.typeformId,
      title,
    });
  } catch {
    // Without an ID we cannot know whether the provider accepted the POST.
    revalidateForms(workspace);
    return {
      status: "failed",
      message:
        "No se pudo confirmar la creación en Typeform. Revisa el listado de formularios antes de reintentar para evitar otra copia.",
      retrySafe: false,
    };
  }

  if (!duplicated) {
    notFound();
  }

  const createdFormId = duplicated.createdForm.id;

  try {
    await prisma.form.upsert({
      where: { typeformId: createdFormId, workspaceId: workspace.id },
      create: {
        title,
        description: `Duplicado desde ${duplicated.baseForm.title}`,
        typeformId: createdFormId,
        selfUrl: duplicated.createdForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      update: {
        title,
        description: `Duplicado desde ${duplicated.baseForm.title}`,
        selfUrl: duplicated.createdForm.self?.href ?? null,
      },
    });
  } catch {
    return pendingRegistration(workspace, createdFormId, title);
  }

  try {
    await createAuditLog({
      action: "FORM_CLONED",
      actor: user,
      target: { type: "form", id: createdFormId },
      context: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        formId: createdFormId,
        formTitle: title,
        metadata: {
          sourceFormId,
          sourceFormTitle: duplicated.baseForm.title ?? null,
        },
      },
    });
  } catch (error) {
    console.error("[DUPLICATE_FORM] Failed to audit persisted copy", error);
  }

  revalidateForms(workspace);

  if (formData.get("_skipRedirect") === "1") {
    return { status: "success", form: { id: createdFormId, title } };
  }

  redirect(getWorkspaceFormsListPath(workspace.id));
}

export async function recoverDuplicatedFormAction(
  workspaceId: string,
  sourceFormId: string,
  createdFormId: string,
): Promise<DuplicateFormResult> {
  const { workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  sourceFormId = sourceFormId.trim();
  createdFormId = createdFormId.trim();
  if (!sourceFormId || !createdFormId || sourceFormId === createdFormId) {
    return {
      status: "failed",
      message: "Se requieren dos identificadores de formulario distintos y no vacíos.",
      retrySafe: true,
    };
  }

  let remote: Awaited<ReturnType<typeof getTypeformForm>>[];
  let canonicalWorkspaceId: string;
  try {
    [canonicalWorkspaceId, ...remote] = await Promise.all([
      resolveWorkspaceTypeformId(workspace.typeformId),
      getTypeformForm(sourceFormId),
      getTypeformForm(createdFormId),
    ]);
  } catch {
    return pendingRegistration(workspace, createdFormId, "Formulario creado");
  }

  const [sourceForm, destinationForm] = remote;
  if (
    sourceForm.id !== sourceFormId ||
    destinationForm.id !== createdFormId ||
    !formBelongsToWorkspace(sourceForm, canonicalWorkspaceId) ||
    !formBelongsToWorkspace(destinationForm, canonicalWorkspaceId)
  ) {
    notFound();
  }

  const title = destinationForm.title;
  let existing;
  try {
    existing = await prisma.form.findUnique({
      where: { typeformId: createdFormId },
    });
  } catch {
    return pendingRegistration(workspace, createdFormId, title);
  }

  if (existing && existing.workspaceId !== workspace.id) {
    notFound();
  }

  try {
    await prisma.form.upsert({
      // Scope the update too: a concurrent foreign registration must fail the
      // unique typeformId constraint, never be reassigned to this workspace.
      where: { typeformId: createdFormId, workspaceId: workspace.id },
      create: {
        typeformId: createdFormId,
        title,
        selfUrl: destinationForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      update: {},
    });
  } catch {
    const concurrent = await prisma.form
      .findUnique({ where: { typeformId: createdFormId } })
      .catch(() => null);
    if (concurrent && concurrent.workspaceId !== workspace.id) {
      notFound();
    }
    return pendingRegistration(workspace, createdFormId, title);
  }

  // Recovery only registers an existing remote form. Client-supplied IDs do
  // not prove clone provenance, so do not invent a FORM_CLONED audit event or
  // a "Duplicado desde" description here. This path never creates remotely.
  revalidateForms(workspace);
  return { status: "success", form: { id: createdFormId, title } };
}
