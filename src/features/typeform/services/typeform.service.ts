import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeFormTitle } from "@/features/typeform/utils/normalize-form-title";
import { usesTypeformResponseFixtures } from "./typeform-fixture-mode";

const TYPEFORM_API_BASE_URL =
  process.env.TYPEFORM_API_BASE_URL ?? "https://api.typeform.com";
const TYPEFORM_RESOLVE_WORKSPACE_TTL_MS = 5 * 60 * 1000;
const TYPEFORM_REQUEST_TIMEOUT_MS = 15_000;
const TYPEFORM_FIXTURES_RESPONSES_DIR = path.join(
  process.cwd(),
  "src/features/typeform/fixtures/responses",
);

const resolvedWorkspaceIdCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

class TypeformApiError extends Error {
  status: number;
  path: string;

  constructor(status: number, path: string) {
    super(`Typeform API error ${status} al consultar ${path}`);
    this.name = "TypeformApiError";
    this.status = status;
    this.path = path;
  }
}

export function isTypeformNotFoundError(error: unknown) {
  return error instanceof TypeformApiError && error.status === 404;
}

type TypeformLinks = {
  display?: string;
  responses?: string;
};

export type TypeformFormSummary = {
  id: string;
  title: string;
  type?: string;
  created_at?: string;
  last_updated_at?: string;
  settings?: {
    is_public?: boolean;
  };
  _links?: TypeformLinks;
  self?: {
    href?: string;
  };
};

export type TypeformFormDetail = TypeformFormSummary & {
  fields?: unknown[];
  hidden?: string[];
  variables?: unknown;
  welcome_screens?: unknown[];
  thankyou_screens?: unknown[];
  logic?: unknown[];
  theme?: unknown;
  workspace?: {
    href?: string;
  };
  [key: string]: unknown;
};

type TypeformFormsResponse = {
  total_items: number;
  page_count: number;
  items: TypeformFormSummary[];
};

export type TypeformWorkspace = {
  id: string;
  name?: string;
  account_id?: string;
  shared?: boolean;
  forms?: {
    count?: number;
    href?: string;
  };
  members?: {
    email?: string;
    name?: string;
    role?: "owner" | "member";
  }[];
  self: {
    href: string;
  };
};

type TypeformWorkspacesResponse = {
  total_items: number;
  page_count: number;
  items: TypeformWorkspace[];
};

type TypeformCreateFormPayload = {
  title: string;
  type?: string;
  workspace?: { href: string };
  settings?: unknown;
  theme?: unknown;
  hidden?: string[];
  variables?: unknown;
  welcome_screens?: unknown[];
  thankyou_screens?: unknown[];
  fields?: unknown[];
  logic?: unknown[];
  [key: string]: unknown;
};

type TypeformCreatedForm = {
  id: string;
  title?: string;
  self?: { href: string };
  _links?: {
    display?: string;
  };
};

type TypeformField = {
  id?: string;
  ref?: string;
  title?: string;
  type?: string;
  fields?: TypeformField[];
  properties?: {
    description?: string;
    fields?: TypeformField[];
  };
};

type TypeformAnswer = {
  type?: string;
  field?: {
    id?: string;
    ref?: string;
    type?: string;
  };
  text?: string;
  email?: string;
  phone_number?: string;
  number?: number;
  boolean?: boolean;
  date?: string;
  url?: string;
  file_url?: string;
  choice?: {
    label?: string;
  };
  choices?: {
    labels?: string[];
  };
  [key: string]: unknown;
};

export type TypeformResponseItem = {
  landing_id?: string;
  response_id?: string;
  token: string;
  landed_at?: string;
  submitted_at?: string;
  hidden?: Record<string, string>;
  answers?: TypeformAnswer[];
  [key: string]: unknown;
};

type TypeformResponsesResponse = {
  total_items: number;
  page_count: number;
  items: TypeformResponseItem[];
};

type TypeformResponsesFixture =
  | TypeformResponseItem[]
  | {
      items?: TypeformResponseItem[];
    };

export type MaskedResponseAnswer = {
  id: string;
  question: string;
  fieldLabel?: string;
  fieldType?: string;
  answerType?: string;
  value: string;
  masked: boolean;
};

export type MaskedTypeformResponse = {
  token: string;
  // Ausente también significa anónimo para consumidores anteriores.
  visibility?: "anonymous" | "winner";
  submittedAt?: string;
  landedAt?: string;
  participantNumber?: string;
  answers: MaskedResponseAnswer[];
  hidden: MaskedResponseAnswer[];
};

function getTypeformToken() {
  const token = process.env.TYPEFORM_TOKEN ?? process.env.TYPEFORM_API_TOKEN;

  if (!token) {
    throw new Error("TYPEFORM_TOKEN o TYPEFORM_API_TOKEN no esta definido");
  }

  return token;
}

function normalizeWorkspaceKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function resolveWorkspaceTypeformId(workspaceTypeformId: string) {
  const cachedWorkspaceId = resolvedWorkspaceIdCache.get(workspaceTypeformId);
  if (cachedWorkspaceId && cachedWorkspaceId.expiresAt > Date.now()) {
    return cachedWorkspaceId.value;
  }

  try {
    await typeformRequest<TypeformWorkspace>(
      `/workspaces/${encodeURIComponent(workspaceTypeformId)}`,
    );

    resolvedWorkspaceIdCache.set(workspaceTypeformId, {
      value: workspaceTypeformId,
      expiresAt: Date.now() + TYPEFORM_RESOLVE_WORKSPACE_TTL_MS,
    });

    return workspaceTypeformId;
  } catch (error) {
    if (!(error instanceof TypeformApiError) || error.status !== 404) {
      throw error;
    }
  }

  const workspaces = await getTypeformWorkspaces();
  const workspaceKey = normalizeWorkspaceKey(workspaceTypeformId);

  const matchedWorkspace = workspaces.items.find((workspace) => {
    const byId = normalizeWorkspaceKey(workspace.id) === workspaceKey;
    const byName = normalizeWorkspaceKey(workspace.name ?? "") === workspaceKey;

    return byId || byName;
  });

  if (matchedWorkspace) {
    console.warn(
      `Workspace Typeform resuelto desde '${workspaceTypeformId}' a '${matchedWorkspace.id}'.`,
    );
    resolvedWorkspaceIdCache.set(workspaceTypeformId, {
      value: matchedWorkspace.id,
      expiresAt: Date.now() + TYPEFORM_RESOLVE_WORKSPACE_TTL_MS,
    });
    return matchedWorkspace.id;
  }

  resolvedWorkspaceIdCache.set(workspaceTypeformId, {
    value: workspaceTypeformId,
    expiresAt: Date.now() + TYPEFORM_RESOLVE_WORKSPACE_TTL_MS,
  });

  return workspaceTypeformId;
}

type TypeformRequestInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

async function typeformRequest<T>(path: string, fetchInit?: TypeformRequestInit) {
  const hasExplicitCacheStrategy =
    typeof fetchInit?.cache !== "undefined" ||
    typeof fetchInit?.next?.revalidate !== "undefined";

  const response = await fetch(`${TYPEFORM_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getTypeformToken()}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TYPEFORM_REQUEST_TIMEOUT_MS),
    ...fetchInit,
    ...(hasExplicitCacheStrategy ? {} : { cache: "no-store" }),
  });

  if (!response.ok) {
    throw new TypeformApiError(response.status, path);
  }

  return response.json() as Promise<T>;
}

export async function getWorkspaceForms(
  workspaceTypeformId: string,
  options?: { page?: number; pageSize?: number },
) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options?.pageSize ?? 12));

  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspaceTypeformId,
  );

  const searchParams = new URLSearchParams({
    workspace_id: resolvedWorkspaceTypeformId,
    page_size: String(pageSize),
    page: String(page),
    sort_by: "last_updated_at",
    order_by: "desc",
  });

  try {
    return await typeformRequest<TypeformFormsResponse>(
      `/forms?${searchParams}`,
      { next: { revalidate: 60 } },
    );
  } catch (error) {
    if (error instanceof TypeformApiError && error.status === 404) {
      console.warn(
        `Typeform workspace_id invalido o inexistente: ${workspaceTypeformId} (resuelto: ${resolvedWorkspaceTypeformId})`,
      );
      return { total_items: 0, page_count: 1, items: [] };
    }
    throw error;
  }
}

export async function findWorkspaceFormsByTitle(
  workspaceTypeformId: string,
  title: string,
): Promise<{ id: string; title: string }[]> {
  const canonicalWorkspaceId = await resolveWorkspaceTypeformId(workspaceTypeformId);
  const normalizedTitle = normalizeFormTitle(title);
  const matches: { id: string; title: string }[] = [];
  let page = 1;
  let pageCount: number;

  do {
    const searchParams = new URLSearchParams({
      workspace_id: canonicalWorkspaceId,
      page_size: "200",
      page: String(page),
    });
    const response = await typeformRequest<TypeformFormsResponse>(
      `/forms?${searchParams}`,
      { method: "GET", cache: "no-store" },
    );
    if (!Number.isInteger(response.page_count) || response.page_count < 0) {
      throw new Error("Typeform devolvió una paginación de formularios inválida");
    }
    for (const form of response.items) {
      if (normalizeFormTitle(form.title) === normalizedTitle) {
        matches.push({ id: form.id, title: form.title });
      }
    }
    pageCount = response.page_count;
    page++;
  } while (page <= pageCount);

  return matches;
}

export async function getTypeformWorkspaces(options?: { page: number }) {
  const searchParams = new URLSearchParams({
    page_size: "200",
  });
  if (options) {
    if (!Number.isSafeInteger(options.page) || options.page < 1) {
      throw new RangeError("La página de workspaces debe ser un entero positivo.");
    }
    searchParams.set("page", String(options.page));
  }

  return typeformRequest<TypeformWorkspacesResponse>(
    `/workspaces?${searchParams}`,
  );
}

/** Catálogo completo y sin caché persistente; nunca inferir bajas de una página parcial. */
export async function getAllTypeformWorkspaces(): Promise<TypeformWorkspace[]> {
  function validatePage(response: TypeformWorkspacesResponse) {
    if (
      !response || !Array.isArray(response.items) ||
      !Number.isSafeInteger(response.total_items) || response.total_items < 0 ||
      !Number.isSafeInteger(response.page_count) || response.page_count < 0 ||
      response.page_count > Math.max(1, response.total_items) ||
      (response.total_items > 0 && (response.page_count === 0 || response.items.length === 0))
    ) {
      throw new Error("Typeform devolvió un catálogo de workspaces inválido o incompleto.");
    }
  }

  const firstPage = await getTypeformWorkspaces();
  validatePage(firstPage);
  const workspaces: TypeformWorkspace[] = [];
  const ids = new Set<string>();

  // Secuencial: no lanzar una ráfaga de peticiones por cada página o workspace.
  for (let page = 1; page <= Math.max(1, firstPage.page_count); page++) {
    const response = page === 1 ? firstPage : await getTypeformWorkspaces({ page });
    validatePage(response);
    if (response.total_items !== firstPage.total_items || response.page_count !== firstPage.page_count) {
      throw new Error("El catálogo de workspaces cambió durante la consulta. Vuelve a intentarlo.");
    }
    for (const workspace of response.items) {
      if (!workspace || typeof workspace.id !== "string" || !workspace.id.trim() || workspace.id !== workspace.id.trim() || ids.has(workspace.id)) {
        throw new Error("Typeform devolvió IDs de workspace inválidos o repetidos.");
      }
      ids.add(workspace.id);
      workspaces.push(workspace);
    }
  }
  if (workspaces.length !== firstPage.total_items) {
    throw new Error("No se pudo cargar el catálogo completo de workspaces de Typeform.");
  }
  return workspaces;
}

export async function getTypeformWorkspace(workspaceTypeformId: string) {
  return typeformRequest<TypeformWorkspace>(
    `/workspaces/${encodeURIComponent(workspaceTypeformId)}`,
  );
}

export async function getTypeformForm(formId: string) {
  return typeformRequest<TypeformFormDetail>(
    `/forms/${encodeURIComponent(formId)}`,
  );
}

export async function getTypeformFormResponses(
  formId: string,
  options?: {
    page?: number;
    pageSize?: number;
    after?: string;
    before?: string;
    includedResponseIds?: string[];
  },
) {
  if (usesTypeformResponseFixtures(formId)) {
    return getFixtureTypeformFormResponses(formId, options);
  }

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const after = options?.after;
  const before = options?.before;
  const includedResponseIds = options?.includedResponseIds?.filter(Boolean) ?? [];

  const searchParams = new URLSearchParams({
    page_size: String(pageSize),
  });

  if (includedResponseIds.length > 0) {
    searchParams.set("included_response_ids", includedResponseIds.join(","));
  }

  if (after) {
    searchParams.set("after", after);
  } else if (before) {
    searchParams.set("before", before);
  } else {
    searchParams.set("page", String(page));
  }

  return typeformRequest<TypeformResponsesResponse>(
    `/forms/${encodeURIComponent(formId)}/responses?${searchParams}`,
  );
}

async function getFixtureTypeformFormResponses(
  formId: string,
  options?: {
    page?: number;
    pageSize?: number;
    after?: string;
    before?: string;
    includedResponseIds?: string[];
  },
): Promise<TypeformResponsesResponse> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 50);
  const includedResponseIds = options?.includedResponseIds?.filter(Boolean) ?? [];
  const fixturePath = path.join(TYPEFORM_FIXTURES_RESPONSES_DIR, `${formId}.json`);

  let fixture: TypeformResponsesFixture;

  try {
    fixture = JSON.parse(await readFile(fixturePath, "utf8")) as TypeformResponsesFixture;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      throw new Error("No se encontró el archivo de respuestas de prueba para este formulario.");
    }

    throw error;
  }

  const fixtureItems = Array.isArray(fixture) ? fixture : fixture?.items;

  if (!Array.isArray(fixtureItems)) {
    throw new Error("El archivo de respuestas de prueba tiene un formato inválido.");
  }

  let items: TypeformResponseItem[] = fixtureItems;

  if (includedResponseIds.length > 0) {
    const included = new Set(includedResponseIds);
    items = items.filter(
      (item) => included.has(item.token) || included.has(item.response_id ?? ""),
    );
  }

  const cursor = options?.after ?? options?.before;
  const startIndex = cursor
    ? Math.max(
        0,
        items.findIndex(
          (item) => item.token === cursor || item.response_id === cursor,
        ) + 1,
      )
    : (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    total_items: items.length,
    page_count: Math.max(1, Math.ceil(items.length / pageSize)),
    items: paginatedItems,
  };
}

export function getTypeformResponseParticipantEmail(
  response: TypeformResponseItem,
) {
  const answerEmail = response.answers?.find(
    (answer) =>
      answer.type === "email" &&
      typeof answer.email === "string" &&
      answer.email.trim().length > 0,
  )?.email;

  if (answerEmail) {
    return answerEmail.trim().toLowerCase();
  }

  const hiddenEmail = Object.entries(response.hidden ?? {}).find(
    ([key, value]) =>
      /email|correo|mail/i.test(key) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
  )?.[1];

  if (hiddenEmail) {
    return hiddenEmail.trim().toLowerCase();
  }

  const answerValueEmail = response.answers
    ?.map((answer) => getAnswerValue(answer))
    .find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

  return answerValueEmail?.trim().toLowerCase() ?? null;
}

export function formBelongsToWorkspace(
  form: TypeformFormDetail,
  workspaceTypeformId: string,
) {
  return (
    form.workspace?.href?.endsWith(`/workspaces/${workspaceTypeformId}`) ??
    false
  );
}

export async function createTypeformWorkspace(name: string) {
  const response = await fetch(`${TYPEFORM_API_BASE_URL}/workspaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTypeformToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(TYPEFORM_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      description?: string;
    } | null;
    throw new Error(`Typeform error: ${error?.description ?? response.status}`);
  }

  const data = (await response.json()) as Partial<TypeformWorkspace>;
  const workspaceId = data.id ?? data.self?.href?.split("/").filter(Boolean).at(-1);

  if (!workspaceId) {
    throw new Error("Typeform no devolvio el ID del workspace creado");
  }

  return {
    ...data,
    id: workspaceId,
    name: data.name ?? name,
    self: {
      href: data.self?.href ?? `${TYPEFORM_API_BASE_URL}/workspaces/${workspaceId}`,
    },
  } as TypeformWorkspace;
}

export async function createTypeformForm(payload: TypeformCreateFormPayload) {
  const response = await fetch(`${TYPEFORM_API_BASE_URL}/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTypeformToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TYPEFORM_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      description?: string;
    } | null;
    throw new Error(`Typeform error: ${error?.description ?? response.status}`);
  }

  const location = response.headers.get("Location");
  const data = (await response.json().catch(() => null)) as TypeformCreatedForm | null;

  if (data?.id) {
    return data;
  }

  const id = location?.split("/").filter(Boolean).at(-1);

  if (!id) {
    throw new Error("Typeform no devolvio el ID del formulario creado");
  }

  return {
    id,
    self: { href: location ?? `${TYPEFORM_API_BASE_URL}/forms/${id}` },
  };
}

function removeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => removeIds(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "id")
      .map(([key, nestedValue]) => [key, removeIds(nestedValue)]),
  );
}

export function buildDuplicateFormPayload(
  form: TypeformFormDetail,
  workspaceTypeformId: string,
  title: string,
) {
  const cloneableKeys = [
    "type",
    "settings",
    "theme",
    "hidden",
    "variables",
    "welcome_screens",
    "thankyou_screens",
    "fields",
    "logic",
  ];

  const payload: TypeformCreateFormPayload = {
    title,
    workspace: {
      href: `${TYPEFORM_API_BASE_URL}/workspaces/${workspaceTypeformId}`,
    },
  };

  for (const key of cloneableKeys) {
    if (form[key] !== undefined) {
      payload[key] = removeIds(form[key]);
    }
  }

  return payload;
}

export async function duplicateTypeformForm({
  formId,
  workspaceTypeformId,
  title,
}: {
  formId: string;
  workspaceTypeformId: string;
  title: string;
}) {
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspaceTypeformId,
  );

  const baseForm = await getTypeformForm(formId);

  if (!formBelongsToWorkspace(baseForm, resolvedWorkspaceTypeformId)) {
    return null;
  }

  const payload = buildDuplicateFormPayload(
    baseForm,
    resolvedWorkspaceTypeformId,
    title,
  );
  const createdForm = await createTypeformForm(payload);

  return {
    baseForm,
    createdForm,
  };
}

export async function createDefaultTypeformFormForWorkspace({
  baseForm,
  baseFormId,
  workspaceTypeformId,
  title,
}: {
  baseForm?: TypeformFormDetail;
  baseFormId: string;
  workspaceTypeformId: string;
  title?: string;
}) {
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspaceTypeformId,
  );

  const resolvedBaseForm = baseForm ?? (await getTypeformForm(baseFormId));
  const payload = buildDuplicateFormPayload(
    resolvedBaseForm,
    resolvedWorkspaceTypeformId,
    title ?? resolvedBaseForm.title,
  );
  const createdForm = await createTypeformForm(payload);

  return {
    baseForm: resolvedBaseForm,
    createdForm,
  };
}

function getAnswerValue(answer: TypeformAnswer) {
  if (answer.email) return answer.email;
  if (answer.phone_number) return answer.phone_number;
  if (answer.text) return answer.text;
  if (answer.choice?.label) return answer.choice.label;
  if (answer.choices?.labels?.length) return answer.choices.labels.join(", ");
  if (typeof answer.number === "number") return String(answer.number);
  if (typeof answer.boolean === "boolean") return answer.boolean ? "Si" : "No";
  if (answer.date) return answer.date;
  if (answer.url) return answer.url;
  if (answer.file_url) return answer.file_url;

  return "Sin respuesta";
}

function normalizeParticipantNumber(value: string) {
  return value.replace(/^#/, "").trim();
}

function getTypeformResponseParticipantNumber(response: TypeformResponseItem) {
  const hiddenEntries = Object.entries(response.hidden ?? {});
  const numericHiddenEntries = hiddenEntries
    .map(
      ([key, value]) =>
        [key, normalizeParticipantNumber(String(value))] as const,
    )
    .filter(([, value]) => /^\d+$/.test(value));

  const preferredEntry = numericHiddenEntries.find(([key]) =>
    /participante|participant|numero|número|nro|folio|codigo|código/i.test(key),
  );

  return preferredEntry?.[1] ?? numericHiddenEntries[0]?.[1];
}

// Solo refs semánticas conocidas: un token arbitrario nunca es una etiqueta.
const readableFieldRefs: Record<string, string> = {
  nombre: "Nombre", nombres: "Nombres", nombre_completo: "Nombre completo",
  first_name: "Nombre", given_name: "Nombre", full_name: "Nombre completo",
  apellido: "Apellido", apellidos: "Apellidos", last_name: "Apellido",
  primer_apellido: "Primer apellido", segundo_apellido: "Segundo apellido",
  rut: "RUT:", email: "Correo electrónico", correo: "Correo electrónico",
  correo_electronico: "Correo electrónico", phone_number: "Teléfono", telefono: "Teléfono",
  region: "Región", state: "Región", comuna: "Comuna", city: "Ciudad",
  address_line_1: "Dirección", address_line_2: "Detalle de dirección",
  country: "País", zip_code: "Código postal",
};

function readableFieldTitle(value?: string) {
  const label = value?.trim().replace(/\s+/g, " ");
  if (!label || label.length > 300 || /[<>_{}@=\\]/.test(label)) return undefined;
  if (/https?:|\b(?:field|ref|id|question|answer)[-_:]|[a-f\d]{12,}|\S-\S/i.test(label) ||
      /[a-záéíóúñ][A-ZÁÉÍÓÚÑ]/.test(label)) return undefined;
  // Una sola palabra minúscula desconocida puede ser un identificador opaco.
  if (!/\s/.test(label) && !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[:?]?$/.test(label) &&
      !readableFieldRefs[label.toLocaleLowerCase("es").replace(/:$/, "")]) return undefined;
  return label;
}

/** Etiqueta segura de una respuesta mapeada; también admite question de DTOs antiguos.
 * Solo servidor: este módulo usa fs. El modal mantiene su guardia local de presentación.
 */
export function getTypeformAnswerFieldLabel(
  answer: { fieldLabel?: string; question?: string },
  index = 0,
) {
  return readableFieldTitle(answer.fieldLabel) ?? readableFieldTitle(answer.question) ?? `Respuesta ${index + 1}`;
}

function flattenResponseAnswers(answers: TypeformAnswer[], fieldsById: Map<string, TypeformField>, fieldsByRef: Map<string, TypeformField>) {
  const flattened: TypeformAnswer[] = [];
  // El extractor de perfiles ya pasa padres, hijos y valores sintéticos alineados.
  // Conservar ese contrato 1:1, sin expandirlos por segunda vez.
  const topLevel = new Set(answers);
  const alreadyFlattened = answers.some((answer) =>
    (Array.isArray(answer.answers) && answer.answers.some((child) => topLevel.has(child))) ||
    ((answer.contact_info || answer.address) && answers.some((item) => !item.field && item.type === "text")),
  );
  if (alreadyFlattened) return answers;
  function visit(items: TypeformAnswer[]) {
    for (const answer of items) {
      if (Array.isArray(answer.answers)) {
        visit(answer.answers);
        continue;
      }
      const field = (answer.field?.id ? fieldsById.get(answer.field.id) : undefined) ??
        (answer.field?.ref ? fieldsByRef.get(answer.field.ref) : undefined);
      const compound = answer.contact_info ?? answer.address;
      if (compound && typeof compound === "object" && !Array.isArray(compound)) {
        const children = field?.properties?.fields ?? field?.fields ?? [];
        for (const [key, value] of Object.entries(compound)) {
          if (typeof value !== "string" || !value.trim()) continue;
          const child = children.find((item) => item.ref === key || item.id === key);
          flattened.push({ type: "text", text: value, field: { id: child?.id, ref: child?.ref ?? key, type: child?.type } });
        }
        continue;
      }
      flattened.push(answer);
    }
  }
  visit(answers);
  return flattened;
}

export function mapMaskedTypeformResponses(
  form: TypeformFormDetail,
  responses: TypeformResponseItem[],
  options?: {
    /** Compatibilidad: nunca concede visibilidad sin un token autorizado. */
    maskSensitive?: boolean;
    unmaskTokens?: Set<string>;
  },
) {
  const unmaskTokens = options?.unmaskTokens;
  const fieldsById = new Map<string, TypeformField>();
  const fieldsByRef = new Map<string, TypeformField>();
  function visitFields(fields: TypeformField[]) {
    for (const field of fields) {
      if (field.id) fieldsById.set(field.id, field);
      if (field.ref) fieldsByRef.set(field.ref, field);
      visitFields(field.properties?.fields ?? field.fields ?? []);
    }
  }
  visitFields((form.fields ?? []) as TypeformField[]);

  return responses.map<MaskedTypeformResponse>((response) => {
    if (!unmaskTokens?.has(response.token)) {
      // No enviar fragmentos, texto libre, hidden ni fechas al navegador.
      return { token: response.token, visibility: "anonymous", answers: [], hidden: [] };
    }
    return {
      token: response.token,
      visibility: "winner",
      submittedAt: response.submitted_at,
      landedAt: response.landed_at,
      participantNumber: getTypeformResponseParticipantNumber(response),
      answers: flattenResponseAnswers(response.answers ?? [], fieldsById, fieldsByRef).map((answer, index) => {
        const field =
          (answer.field?.id ? fieldsById.get(answer.field.id) : undefined) ??
          (answer.field?.ref ? fieldsByRef.get(answer.field.ref) : undefined);
        const fieldLabel = readableFieldTitle(field?.title) ??
          readableFieldRefs[(field?.ref ?? answer.field?.ref ?? "").trim().toLocaleLowerCase("es").replace(/[ -]+/g, "_")] ??
          `Respuesta ${index + 1}`;
        return {
          id: answer.field?.id ?? answer.field?.ref ?? `${response.token}-${index}`,
          question: fieldLabel,
          fieldLabel,
          fieldType: field?.type ?? answer.field?.type,
          answerType: answer.type,
          value: getAnswerValue(answer),
          masked: false,
        };
      }),
      hidden: Object.entries(response.hidden ?? {}).map(([key, value]) => ({
        id: key,
        question: key,
        answerType: "hidden",
        value,
        masked: false,
      })),
    };
  });
}
