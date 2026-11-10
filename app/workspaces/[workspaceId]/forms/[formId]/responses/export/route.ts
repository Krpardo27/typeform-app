import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getAuthorizedWorkspace } from "@/features/admin/workspaces/services/workspace-permissions";
import { requireWinnerRevealGrant, WinnerRevealDenied } from "@/features/typeform/services/winner-reveal.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { loadFormResponses } from "@/features/typeform/services/load-form-responses";
import {
  getWinnerCandidateProfiles,
  maskWinnerCandidateProfile,
} from "@/features/typeform/components/responses/winner-selection/utils";
import {
  formBelongsToWorkspace,
  getTypeformAnswerFieldLabel,
  getTypeformForm,
  getTypeformResponseParticipantEmail,
  isTypeformNotFoundError,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
  type MaskedTypeformResponse,
  type MaskedResponseAnswer,
  type TypeformFormDetail,
  type TypeformResponseItem,
} from "@/features/typeform/services/typeform.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function exportMessage(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function getExportTitle(title?: string | null) {
  return title
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100)
    .replace(/^-+|-+$/g, "") || "concurso";
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  // Las comillas CSV no impiden fórmulas. Preservar el literal completo,
  // incluso si Excel ignora espacios/controles antes del operador.
  const literal = /^[\s\p{Cc}\p{Cf}]*[=+\-@\p{Cc}\p{Cf}]/u.test(text) ? `'${text}` : text;

  return `"${literal.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: unknown[][]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

function getParticipantContact(response: MaskedTypeformResponse) {
  if (response.visibility !== "winner") return "";
  const candidates = response.answers;
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

const metadataHeaders = ["participant_number", "token", "submitted_at", "contact", "selected_at", "winner_reason"];

function normalizedLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/:$/, "");
}

type ExportColumn = { key: string; header: string; geography?: "region" | "city" };
type ExportField = { id?: string; ref?: string; title?: string; type?: string; fields?: ExportField[]; properties?: { fields?: ExportField[] } };

function getExportColumns(form: TypeformFormDetail, responses: MaskedTypeformResponse[], rawResponses: TypeformResponseItem[]) {
  const columns: ExportColumn[] = [];
  const byIdentity = new Map<string, ExportColumn>();
  const fieldsById = new Map<string, ExportField>();
  const fieldsByRef = new Map<string, ExportField>();
  const columnsByField = new Map<ExportField, ExportColumn>();
  const usedHeaders = new Set(metadataHeaders);
  function add(key: string, label: string, geography?: ExportColumn["geography"]) {
    let header = label;
    let suffix = 2;
    while (usedHeaders.has(header)) header = `${label} (${suffix++})`;
    usedHeaders.add(header);
    const column = { key, header, geography };
    columns.push(column);
    return column;
  }
  // Incluir también preguntas sin respuesta, en el orden del esquema real.
  function visit(fields: unknown[]) {
    for (const value of fields) {
      if (!value || typeof value !== "object") continue;
      const field = value as ExportField;
      if (field.id) fieldsById.set(field.id, field);
      if (field.ref) fieldsByRef.set(field.ref, field);
      const children = field.properties?.fields ?? field.fields;
      if (children?.length) { visit(children); continue; }
      if (field.type === "statement" || (!field.id && !field.ref)) continue;
      const key = `schema:${columns.length}`;
      const label = getTypeformAnswerFieldLabel({ fieldLabel: field.title }, columns.length);
      // Solo títulos del esquema habilitan ubicación visible, nunca refs de respuestas.
      const normalized = normalizedLabel(field.title ?? "");
      const geography = normalized === "region" ? "region"
        : /^(comuna|ciudad|city)$/.test(normalized) ? "city" : undefined;
      const column = add(key, label, geography);
      columnsByField.set(field, column);
    }
  }
  visit(form.fields ?? []);
  const rawByToken = new Map(rawResponses.map((response) => [response.token, response]));
  // El DTO del mapper usa id ?? ref. Mantener aquí sus espacios de identidad
  // separados evita que una ref sintética "city" se confunda con un ID real.
  function answerKeys(response: TypeformResponseItem) {
    const keys: string[] = [];
    function key(field?: { id?: string; ref?: string }) {
      const schema = (field?.id ? fieldsById.get(field.id) : undefined) ??
        (field?.ref ? fieldsByRef.get(field.ref) : undefined);
      return (schema ? columnsByField.get(schema)?.key : undefined) ??
        (field?.id ? `id:${field.id}` : field?.ref ? `ref:${field.ref}` : `position:${keys.length}`);
    }
    function visitAnswers(answers: NonNullable<TypeformResponseItem["answers"]>) {
      for (const answer of answers) {
        if (Array.isArray(answer.answers)) { visitAnswers(answer.answers); continue; }
        const compound = answer.contact_info ?? answer.address;
        if (compound && typeof compound === "object" && !Array.isArray(compound)) {
          const parent = (answer.field?.id ? fieldsById.get(answer.field.id) : undefined) ??
            (answer.field?.ref ? fieldsByRef.get(answer.field.ref) : undefined);
          const children = parent?.properties?.fields ?? parent?.fields ?? [];
          for (const [ref, value] of Object.entries(compound)) {
            if (typeof value !== "string" || !value.trim()) continue;
            const child = children.find((field) => field.id === ref || field.ref === ref);
            keys.push(key({ id: child?.id, ref: child?.ref ?? ref }));
          }
        } else keys.push(key(answer.field));
      }
    }
    visitAnswers(response.answers ?? []);
    return keys;
  }
  const keysByToken = new Map<string, Map<string, MaskedResponseAnswer>>();
  for (const response of responses) {
    const answers = new Map<string, MaskedResponseAnswer>();
    const raw = rawByToken.get(response.token);
    const identities = raw ? answerKeys(raw) : [];
    response.answers.forEach((answer, index) => {
      const identity = identities[index] ?? `position:${index}`;
      let column = columns.find((column) => column.key === identity) ?? byIdentity.get(identity);
      if (!column) {
        column = add(identity, getTypeformAnswerFieldLabel(answer, index));
        byIdentity.set(identity, column);
      }
      answers.set(column.key, answer);
    });
    keysByToken.set(response.token, answers);
  }
  return { columns, keysByToken };
}

function maskExportAnswer(answer: MaskedResponseAnswer | undefined, column: ExportColumn) {
  if (!answer || !answer.value.trim() || answer.value === "Sin respuesta") return "";
  const value = answer.value.trim();
  if (column.geography === "region" && maskWinnerCandidateProfile({ region: value }).region) return value;
  if (column.geography === "city" && /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,99}$/u.test(value)) return value;
  const label = normalizedLabel(getTypeformAnswerFieldLabel(answer));
  if (answer.answerType === "email" || /\b(email|correo)\b/.test(label)) {
    return maskWinnerCandidateProfile({ email: value }).email ?? "";
  }
  if (/\b(nombre|nombres|apellido|apellidos)\b/.test(label)) {
    return maskWinnerCandidateProfile({ label: value }).label ?? "";
  }
  // Texto libre, RUT, teléfono y fechas personales: denegar por defecto.
  return "****";
}

function getParticipantNumbers(responses: TypeformResponseItem[]) {
  function time(response: TypeformResponseItem) {
    const value = Date.parse(response.submitted_at ?? response.landed_at ?? "");
    return Number.isNaN(value) ? 0 : value;
  }
  const chronological = [...responses].sort((a, b) => time(a) - time(b) || a.token.localeCompare(b.token));
  const emails = new Set<string>();
  const numbers = new Map<string, number>();
  // Numeración cronológica de la tabla, sin perder respuestas por email repetido.
  for (const response of chronological) {
    const email = getTypeformResponseParticipantEmail(response);
    if (email && emails.has(email)) continue;
    if (email) emails.add(email);
    numbers.set(response.token, numbers.size + 1);
  }
  for (const response of responses) {
    if (!numbers.has(response.token)) numbers.set(response.token, numbers.size + 1);
  }
  return numbers;
}

function createCsvResponse(csv: string, filename: string) {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
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
      "Cache-Control": "private, no-store",
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
    return exportMessage("Debes iniciar sesión.", 401);
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    const allowedUser = await prisma.allowedUser.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" } },
      select: { id: true },
    });

    if (!allowedUser) {
      return exportMessage("No autorizado.", 403);
    }
  }

  const workspace = await getAuthorizedWorkspace(user, workspaceId);

  if (!workspace) {
    return exportMessage("Workspace no encontrado.", 404);
  }

  if (workspace.role !== "EDITOR") {
    return exportMessage("Solo los usuarios con rol editor pueden exportar respuestas.", 403);
  }

  try {
    const flowToken = request.headers.get("X-Winner-Flow");
    const reveal = scope === "winners"
      ? await requireWinnerRevealGrant(flowToken ?? "", workspaceId, formId)
      : null;
    const form = await getTypeformForm(formId);
    const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
      workspace.typeformId,
    );

    if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
      return exportMessage("Formulario no encontrado.", 404);
    }

    const localForm = await prisma.form.findUnique({
      where: { typeformId: form.id },
      select: { id: true, workspaceId: true },
    });
    if (localForm && localForm.workspaceId !== workspace.id) {
      return exportMessage("Formulario no encontrado.", 404);
    }

    const winners = scope === "winners" && localForm
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
      return exportMessage("No hay ganadores para exportar.", 400);
    }

    const winnerTokens = new Set(winners
      .filter((winner) => scope !== "winners" || reveal?.grant.responseTokens.includes(winner.responseToken))
      .map((winner) => winner.responseToken));
    const incompleteWinners = () => exportMessage(
      "No se puede exportar: faltan respuestas de ganadores o el conjunto está incompleto. Vuelve a consultar los ganadores guardados.",
      409,
    );
    if (reveal && (!winnerTokens.size || winnerTokens.size !== reveal.grant.responseTokens.length ||
      reveal.grant.responseTokens.some((token) => !token.trim() || !winnerTokens.has(token)))) {
      return incompleteWinners();
    }
    function containsAllWinners(responses: { token: string }[]) {
      return responses.length === winnerTokens.size &&
        new Set(responses.map((response) => response.token)).size === winnerTokens.size &&
        responses.every((response) => winnerTokens.has(response.token));
    }
    const winnersByToken = new Map(
      winners.map((winner) => [winner.responseToken, winner] as const),
    );
    const rawResponses = await loadFormResponses(form.id);
    if (reveal) await requireWinnerRevealGrant(flowToken!, workspaceId, formId);
    const scopedRawResponses =
      scope === "winners"
        ? rawResponses.filter((response) => winnerTokens.has(response.token))
        : rawResponses;
    if (reveal && !containsAllWinners(scopedRawResponses)) return incompleteWinners();

    if (scope === "participants" && scopedRawResponses.length === 0) {
      return exportMessage("No hay participantes para exportar.", 400);
    }

    const participantProfiles = scope === "participants"
      ? new Map([...getWinnerCandidateProfiles(form, scopedRawResponses, mapMaskedTypeformResponses)]
          .map(([token, profile]) => [token, maskWinnerCandidateProfile(profile)] as const))
      : null;
    // Datos completos solo en memoria del servidor: participants se enmascara
    // celda por celda antes de cualquier serialización CSV/XLSX.
    const projectedResponses = mapMaskedTypeformResponses(form, scopedRawResponses, {
      maskSensitive: true,
      unmaskTokens: scope === "winners" ? winnerTokens : new Set(scopedRawResponses.map((response) => response.token)),
    });
    if (reveal && (!containsAllWinners(projectedResponses) ||
      projectedResponses.some((response) => response.visibility !== "winner"))) return incompleteWinners();
    const maskedResponses: MaskedTypeformResponse[] = scope === "winners"
      ? projectedResponses.filter((response) => winnerTokens.has(response.token) && response.visibility === "winner")
      : projectedResponses;
    const participantNumbers = getParticipantNumbers(rawResponses);
    const rawByToken = new Map(rawResponses.map((response) => [response.token, response]));
    const { columns, keysByToken } = getExportColumns(form, maskedResponses, scopedRawResponses);
    const headers = [...metadataHeaders, ...columns.map((column) => column.header)];
    const rows = maskedResponses.map((response) => {
      const winner = winnersByToken.get(response.token);
      const profile = participantProfiles?.get(response.token);
      const answers = keysByToken.get(response.token);

      return [
        participantNumbers.get(response.token),
        response.token,
        rawByToken.get(response.token)?.submitted_at ?? response.submittedAt ?? "",
        scope === "winners"
          ? winner?.participantEmail ?? getParticipantContact(response)
          : profile?.email ?? "",
        scope === "winners" ? winner?.selectedAt.toISOString() ?? "" : "",
        scope === "winners" ? winner?.reason ?? "" : "",
        ...columns.map((column) => scope === "winners"
          ? answers?.get(column.key)?.value ?? ""
          : maskExportAnswer(answers?.get(column.key), column)),
      ];
    });
    if (reveal) {
      await createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required: true, actor: reveal.actor.user,
        target: { type: "form_winner_data", id: form.id }, context: {
          workspaceId: workspace.id, formId: form.id, formTitle: form.title,
          metadata: {
            scope: "winner_export", format, displayedResponses: maskedResponses.length,
            revealedTokens: maskedResponses.map((response) => response.token).join(","),
            reasons: JSON.stringify(maskedResponses.map((response) => ({
              responseToken: response.token, reason: winnersByToken.get(response.token)?.reason ?? "",
            }))),
          },
        } });
      await requireWinnerRevealGrant(flowToken!, workspaceId, formId);
    }

    const exportName = scope === "winners" ? "ganadores" : "participantes";
    const filename = `${exportName}-${getExportTitle(form.title)}-${form.id}.${format}`;

    if (format === "csv") {
      const csv = buildCsv(headers, rows);

      return createCsvResponse(csv, filename);
    }

    const sheetName = scope === "winners" ? "Ganadores" : "Participantes";

    return createXlsxResponse({
      headers,
      rows,
      filename,
      sheetName,
    });
  } catch (error) {
    if (error instanceof WinnerRevealDenied) {
      return exportMessage(error.message, 403);
    }
    if (isTypeformNotFoundError(error)) {
      return exportMessage("Formulario no encontrado.", 404);
    }

    console.error("[RESPONSES_EXPORT_ERROR]");

    return exportMessage("No se pudo generar la exportación.", 500);
  }
}