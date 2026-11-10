import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { getEmbedInfo } from "@/features/typeform/utils/embed-info";

export const WORKSPACE_PAGE_SIZES = [12, 24, 48] as const;
export const WORKSPACE_FORMS_PAGE_SIZE = 12;

export function parseWorkspacePage(value: unknown) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 0;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseWorkspacePageSize(value: unknown) {
  const parsed = parseWorkspacePage(value);
  return WORKSPACE_PAGE_SIZES.find((size) => size === parsed) ?? WORKSPACE_PAGE_SIZES[0];
}

export function getFormVisibility(isPublic: boolean | undefined) {
  if (isPublic === true) return "Público";
  if (isPublic === false) return "Privado";
  return "Visibilidad no informada";
}

export function getFormDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return {
    dateTime: date.toISOString(),
    label: new Intl.DateTimeFormat("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
}

export function getWorkspaceFormUrl(
  form: TypeformFormSummary,
  workspaceTypeformId: string,
  templateFormTypeformId: string | null,
) {
  const embed = getEmbedInfo(form.id, workspaceTypeformId, undefined, templateFormTypeformId);
  const candidate = embed.publicUrl ?? embed.src ?? form._links?.display;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}