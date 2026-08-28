"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";

const WINNER_COOKIE_PREFIX = "winner_selection";

export async function selectWinnersAction(
  workspaceId: string,
  formId: string,
  formData: FormData,
) {
  const { user, workspace } = await getWorkspaceAccessContext(workspaceId);

  const dbAccess = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
    select: {
      userId: true,
      workspaceId: true,
      role: true,
      createdAt: true,
    },
  });

  const effectiveWorkspaceRole = dbAccess?.role ?? workspace.role;

  console.log("[WINNER_PERMISSION_CHECK]", {
    workspaceId,
    formId,
    currentUserId: user.id,
    currentUserEmail: user.email,
    currentUserGlobalRole: user.globalRole,
    computedWorkspaceRole: workspace.role,
    dbWorkspaceRole: dbAccess?.role ?? null,
    effectiveWorkspaceRole,
    dbUserWorkspace: dbAccess,
    workspaceName: workspace.name,
    workspaceTypeformId: workspace.typeformId,
    canSelectWinners: effectiveWorkspaceRole === "EDITOR",
  });

  const canSelectWinners =
    user.globalRole === "SUPER_ADMIN" || effectiveWorkspaceRole === "EDITOR";

  if (!canSelectWinners) {
    console.log("[WINNER_PERMISSION_DENIED]", {
      workspaceId,
      formId,
      currentUserId: user.id,
      currentUserEmail: user.email,
      currentUserGlobalRole: user.globalRole,
      workspaceRole: workspace.role,
      workspaceName: workspace.name,
    });
    redirect(`/workspaces/${workspaceId}/forms/${formId}/responses?winnerError=forbidden`);
  }

  const winnerTokens = formData
    .getAll("winnerToken")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const page =
    typeof formData.get("page") === "string" ? String(formData.get("page")) : "1";
  const pageSize =
    typeof formData.get("pageSize") === "string"
      ? String(formData.get("pageSize"))
      : "20";

  const reason =
    typeof formData.get("reason") === "string" && formData.get("reason")
      ? String(formData.get("reason"))
      : "Seleccion manual de ganadores";

  let localForm = await prisma.form.findUnique({
    where: { typeformId: formId },
    select: { id: true },
  });

  if (!localForm) {
    const [typeformForm, resolvedWorkspaceTypeformId] = await Promise.all([
      getTypeformForm(formId),
      resolveWorkspaceTypeformId(workspace.typeformId),
    ]);

    if (!formBelongsToWorkspace(typeformForm, resolvedWorkspaceTypeformId)) {
      redirect(`/workspaces/${workspaceId}/forms/${formId}/responses?winnerError=forbidden`);
    }

    localForm = await prisma.form.upsert({
      where: { typeformId: formId },
      create: {
        title: typeformForm.title ?? formId,
        description: null,
        typeformId: formId,
        selfUrl: typeformForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      update: {
        title: typeformForm.title ?? formId,
        selfUrl: typeformForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });
  }

  const existingWinnerRows = await prisma.formWinner.findMany({
    where: {
      formId: localForm.id,
      workspaceId,
    },
    select: {
      responseToken: true,
    },
  });

  const existingWinnerTokens = new Set(
    existingWinnerRows.map((winner) => winner.responseToken),
  );
  const tokensToRemove = [...existingWinnerTokens].filter(
    (token) => !winnerTokens.includes(token),
  );

  if (tokensToRemove.length > 0) {
    await prisma.formWinner.deleteMany({
      where: {
        formId: localForm.id,
        workspaceId,
        responseToken: {
          in: tokensToRemove,
        },
      },
    });
  }

  await Promise.all(
    winnerTokens.map(async (token) => {
      await prisma.formWinner.upsert({
        where: {
          formId_responseToken: {
            formId: localForm.id,
            responseToken: token,
          },
        },
        update: {
          reason,
          selectedByUserId: user.id,
          selectedAt: new Date(),
        },
        create: {
          formId: localForm.id,
          workspaceId,
          responseToken: token,
          reason,
          selectedByUserId: user.id,
          selectedAt: new Date(),
        },
      });
    }),
  );

  const cookieStore = await cookies();
  const cookieName = `${WINNER_COOKIE_PREFIX}:${workspaceId}:${formId}`;
  const cookiePath = `/workspaces/${workspaceId}/forms/${formId}/responses`;

  if (winnerTokens.length === 0) {
    cookieStore.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: cookiePath,
      maxAge: 0,
    });
  } else {
    cookieStore.set(
      cookieName,
      JSON.stringify({
        tokens: winnerTokens,
        reason,
        at: new Date().toISOString(),
        by: user.id,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: cookiePath,
        maxAge: 120,
      },
    );
  }

  await createAuditLog({
    action: "WINNER_SELECTED",
    actor: user,
    target: { type: "form_winners", id: formId },
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      formId,
      metadata: {
        winnerCount: winnerTokens.length,
        winnerTokens: winnerTokens.join(","),
        reason,
      },
    },
  });

  redirect(
    `/workspaces/${workspaceId}/forms/${formId}/responses?page=${encodeURIComponent(
      page,
    )}&pageSize=${encodeURIComponent(pageSize)}&winnerSelection=1`,
  );
}
