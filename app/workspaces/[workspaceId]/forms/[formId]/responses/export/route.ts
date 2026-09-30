import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getAuthorizedWorkspace } from "@/features/admin/workspaces/services/workspace-permissions";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformFormResponses,
  getTypeformResponseParticipantEmail,
  isTypeformNotFoundError,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
  type MaskedTypeformResponse,
  type TypeformResponseItem,
} from "@/features/typeform/services/typeform.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPORT_PAGE_SIZE = 100;

function csvEscape(value: unknown) {
  const text = String(value ?? "");

  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: unknown[][]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

function getParticipantContact(response: MaskedTypeformResponse) {
  const candidates = [...response.answers, ...response.hidden];
  const byQuestionHint = candidates.find((answer) => {
    const question = answer.question.toLowerCase();

    return question.includes("email") || question.includes("correo");
  });

  if (byQuestionHint?.value?.trim()) {
    return byQuestionHint.value.trim();
  }

  const byEmailPattern = candidates.find((answer) =>
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(answer.value),
  );

  return byEmailPattern?.value?.trim() ?? "";
}

function getUniqueQuestions(responses: MaskedTypeformResponse[]) {
  const questions = new Set<string>();

  for (const response of responses) {
    for (const answer of response.answers) {
      questions.add(answer.question);
    }
  }

  return [...questions];
}

function getAnswerValueByQuestion(
  response: MaskedTypeformResponse,
  question: string,
) {
  return response.answers.find((answer) => answer.question === question)?.value ?? "";
}

function deduplicateByToken<T extends { token: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.token)) {
      return false;
    }

    seen.add(item.token);
    return true;
  });
}

function deduplicateParticipantsByEmail(responses: TypeformResponseItem[]) {
  const seenEmails = new Set<string>();

  return responses.filter((response) => {
    const email = getTypeformResponseParticipantEmail(response);

    if (!email) {
      return true;
    }

    if (seenEmails.has(email)) {
      return false;
    }

    seenEmails.add(email);
    return true;
  });
}

async function getAllFormResponses(formId: string) {
  const allResponses: TypeformResponseItem[] = [];
  let before: string | undefined;
  let expectedTotal: number | null = null;

  while (true) {
    const pageResult = await getTypeformFormResponses(formId, {
      pageSize: EXPORT_PAGE_SIZE,
      before,
    });

    if (expectedTotal === null) {
      expectedTotal = pageResult.total_items;
    }

    if (pageResult.items.length === 0) {
      break;
    }

    allResponses.push(...pageResult.items);

    if (pageResult.items.length < EXPORT_PAGE_SIZE) {
      break;
    }

    if (expectedTotal !== null && allResponses.length >= expectedTotal) {
      break;
    }

    const lastToken = pageResult.items.at(-1)?.token;
    if (!lastToken || lastToken === before) {
      break;
    }

    before = lastToken;
  }

  return deduplicateByToken(allResponses);
}

function createCsvResponse(csv: string, filename: string) {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function getColumnWidth(values: unknown[]) {
  const maxLength = values.reduce<number>((max, value) => {
    const text = String(value ?? "");

    return Math.max(max, text.length);
  }, 10);

  return { wch: Math.min(Math.max(maxLength + 2, 12), 48) };
}

function createXlsxResponse({
  headers,
  rows,
  filename,
  sheetName,
}: {
  headers: string[];
  rows: unknown[][];
  filename: string;
  sheetName: string;
}) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = headers.map((_, index) =>
    getColumnWidth([headers[index], ...rows.map((row) => row[index])]),
  );
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length, 1), c: Math.max(headers.length - 1, 0) },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
  const body = new Uint8Array(buffer.byteLength);
  body.set(buffer);

  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string; formId: string }> },
) {
  const { workspaceId, formId } = await context.params;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "winners" ? "winners" : "participants";
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ message: "Debes iniciar sesión." }, { status: 401 });
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    const allowedUser = await prisma.allowedUser.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" } },
      select: { id: true },
    });

    if (!allowedUser) {
      return Response.json({ message: "No autorizado." }, { status: 403 });
    }
  }

  const workspace = await getAuthorizedWorkspace(user, workspaceId);

  if (!workspace) {
    return Response.json({ message: "Workspace no encontrado." }, { status: 404 });
  }

  if (workspace.role !== "EDITOR") {
    return Response.json(
      { message: "Solo los usuarios con rol editor pueden exportar respuestas." },
      { status: 403 },
    );
  }

  try {
    const form = await getTypeformForm(formId);
    const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
      workspace.typeformId,
    );

    if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
      return Response.json({ message: "Formulario no encontrado." }, { status: 404 });
    }

    const localForm = await prisma.form.findUnique({
      where: { typeformId: form.id },
      select: { id: true },
    });

    const winners = localForm
      ? await prisma.formWinner.findMany({
          where: {
            formId: localForm.id,
            workspaceId: workspace.id,
          },
          select: {
            responseToken: true,
            participantEmail: true,
            reason: true,
            selectedAt: true,
          },
          orderBy: { selectedAt: "asc" },
        })
      : [];

    if (scope === "winners" && winners.length === 0) {
      return Response.json(
        { message: "No hay ganadores para exportar." },
        { status: 400 },
      );
    }

    const winnerTokens = new Set(winners.map((winner) => winner.responseToken));
    const winnersByToken = new Map(
      winners.map((winner) => [winner.responseToken, winner] as const),
    );
    const rawResponses = await getAllFormResponses(form.id);
    const scopedRawResponses =
      scope === "winners"
        ? rawResponses.filter((response) => winnerTokens.has(response.token))
        : deduplicateParticipantsByEmail(rawResponses);

    if (scope === "participants" && scopedRawResponses.length === 0) {
      return Response.json(
        { message: "No hay participantes para exportar." },
        { status: 400 },
      );
    }

    const maskedResponses = mapMaskedTypeformResponses(form, scopedRawResponses, {
      maskSensitive: true,
      unmaskTokens: scope === "winners" ? winnerTokens : undefined,
    });
    const questions = getUniqueQuestions(maskedResponses);
    const headers = [
      "participant_number",
      "token",
      "submitted_at",
      "contact",
      ...(scope === "winners" ? ["selected_at", "winner_reason"] : []),
      ...questions,
    ];
    const rows = maskedResponses.map((response, index) => {
      const winner = winnersByToken.get(response.token);

      return [
        index + 1,
        response.token,
        response.submittedAt ?? "",
        winner?.participantEmail ?? getParticipantContact(response),
        ...(scope === "winners"
          ? [winner?.selectedAt.toISOString() ?? "", winner?.reason ?? ""]
          : []),
        ...questions.map((question) => getAnswerValueByQuestion(response, question)),
      ];
    });

    if (format === "csv") {
      const csv = buildCsv(headers, rows);
      const filename = `${scope}-${form.id}.csv`;

      return createCsvResponse(csv, filename);
    }

    const exportName = scope === "winners" ? "ganadores" : "participantes";
    const sheetName = scope === "winners" ? "Ganadores" : "Participantes";

    return createXlsxResponse({
      headers,
      rows,
      filename: `${exportName}-${form.id}.xlsx`,
      sheetName,
    });
  } catch (error) {
    if (isTypeformNotFoundError(error)) {
      return Response.json({ message: "Formulario no encontrado." }, { status: 404 });
    }

    console.error("[RESPONSES_EXPORT_ERROR]", error);

    return Response.json(
      { message: "No se pudo generar la exportación." },
      { status: 500 },
    );
  }
}