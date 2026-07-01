"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

const WINNER_COOKIE_PREFIX = "winner_selection";

export async function selectWinnersAction(
  workspaceId: string,
  formId: string,
  formData: FormData,
) {
  const { user, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    redirect(`/workspaces/${workspaceId}/forms/${formId}/responses?winnerError=forbidden`);
  }

  const winnerTokens = formData
    .getAll("winnerToken")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (winnerTokens.length === 0) {
    redirect(`/workspaces/${workspaceId}/forms/${formId}/responses?winnerError=empty`);
  }

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

  const cookieStore = await cookies();
  const cookieName = `${WINNER_COOKIE_PREFIX}:${workspaceId}:${formId}`;

  cookieStore.set(
    cookieName,
    JSON.stringify({
      tokens: winnerTokens,
      at: new Date().toISOString(),
      by: user.id,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: `/workspaces/${workspaceId}/forms/${formId}/responses`,
      maxAge: 120,
    },
  );

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

  await createAuditLog({
    action: "SENSITIVE_DATA_VIEWED",
    actor: user,
    target: { type: "form_winner_data", id: formId },
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      formId,
      metadata: {
        winnerCount: winnerTokens.length,
        winnerTokens: winnerTokens.join(","),
        reason,
        scope: "winner_selection_flow",
      },
    },
  });

  redirect(
    `/workspaces/${workspaceId}/forms/${formId}/responses?page=${encodeURIComponent(
      page,
    )}&pageSize=${encodeURIComponent(pageSize)}&winnerSelection=1`,
  );
}
