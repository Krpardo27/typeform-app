const TYPEFORM_API_BASE_URL =
  process.env.TYPEFORM_API_BASE_URL ?? "https://api.typeform.com";

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
  properties?: {
    description?: string;
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

export type MaskedResponseAnswer = {
  id: string;
  question: string;
  fieldType?: string;
  answerType?: string;
  value: string;
  masked: boolean;
};

export type MaskedTypeformResponse = {
  token: string;
  submittedAt?: string;
  landedAt?: string;
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
  try {
    await typeformRequest<TypeformWorkspace>(
      `/workspaces/${encodeURIComponent(workspaceTypeformId)}`,
    );

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
    return matchedWorkspace.id;
  }

  return workspaceTypeformId;
}

async function typeformRequest<T>(path: string) {
  const response = await fetch(`${TYPEFORM_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getTypeformToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new TypeformApiError(response.status, path);
  }

  return response.json() as Promise<T>;
}

export async function getWorkspaceForms(workspaceTypeformId: string) {
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspaceTypeformId,
  );

  const searchParams = new URLSearchParams({
    workspace_id: resolvedWorkspaceTypeformId,
    page_size: "200",
    sort_by: "last_updated_at",
    order_by: "desc",
  });

  let firstPage: TypeformFormsResponse;

  try {
    firstPage = await typeformRequest<TypeformFormsResponse>(
      `/forms?${searchParams}`,
    );
  } catch (error) {
    if (error instanceof TypeformApiError && error.status === 404) {
      console.warn(
        `Typeform workspace_id invalido o inexistente: ${workspaceTypeformId} (resuelto: ${resolvedWorkspaceTypeformId})`,
      );

      return {
        total_items: 0,
        page_count: 1,
        items: [],
      };
    }

    throw error;
  }

  if (firstPage.page_count <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.page_count - 1 }, (_, index) => {
      const pageParams = new URLSearchParams(searchParams);
      pageParams.set("page", String(index + 2));

      return typeformRequest<TypeformFormsResponse>(`/forms?${pageParams}`);
    }),
  );

  return {
    ...firstPage,
    items: [
      ...firstPage.items,
      ...remainingPages.flatMap((page) => page.items),
    ],
  };
}

export async function getTypeformWorkspaces() {
  const searchParams = new URLSearchParams({
    page_size: "200",
  });

  return typeformRequest<TypeformWorkspacesResponse>(
    `/workspaces?${searchParams}`,
  );
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
  },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;

  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return typeformRequest<TypeformResponsesResponse>(
    `/forms/${encodeURIComponent(formId)}/responses?${searchParams}`,
  );
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Typeform error: ${error.description ?? response.status}`);
  }

  return response.json() as Promise<TypeformWorkspace>;
}

export async function createTypeformForm(payload: TypeformCreateFormPayload) {
  const response = await fetch(`${TYPEFORM_API_BASE_URL}/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTypeformToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
  baseFormId,
  workspaceTypeformId,
  title,
}: {
  baseFormId: string;
  workspaceTypeformId: string;
  title?: string;
}) {
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspaceTypeformId,
  );

  const baseForm = await getTypeformForm(baseFormId);
  const payload = buildDuplicateFormPayload(
    baseForm,
    resolvedWorkspaceTypeformId,
    title ?? baseForm.title,
  );
  const createdForm = await createTypeformForm(payload);

  return {
    baseForm,
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

function hasSensitiveKeyword(value?: string) {
  if (!value) return false;

  return /email|correo|mail|rut|r\.u\.t|telefono|teléfono|phone|celular|mobile|whatsapp|dni|documento|document|pasaporte|passport|identificador|identifier|nombre|apellido|name|address|direccion|dirección/i.test(
    value,
  );
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");

  if (!name || !domain) return "***";

  return `${name.slice(0, 2)}***@${domain}`;
}

function maskText(value: string) {
  if (value.length <= 4) return "***";

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function maskAnswerValue(value: string, answerType?: string) {
  if (value === "Sin respuesta") return value;
  if (answerType === "email" || value.includes("@")) return maskEmail(value);

  return maskText(value);
}

function isSensitiveAnswer(answer: TypeformAnswer, field?: TypeformField) {
  return (
    answer.type === "email" ||
    answer.type === "phone_number" ||
    field?.type === "email" ||
    field?.type === "phone_number" ||
    hasSensitiveKeyword(field?.title) ||
    hasSensitiveKeyword(field?.ref) ||
    hasSensitiveKeyword(answer.field?.ref)
  );
}

export function mapMaskedTypeformResponses(
  form: TypeformFormDetail,
  responses: TypeformResponseItem[],
  options?: {
    maskSensitive?: boolean;
    unmaskTokens?: Set<string>;
  },
) {
  const maskSensitive = options?.maskSensitive ?? true;
  const unmaskTokens = options?.unmaskTokens;
  const fields = (form.fields ?? []) as TypeformField[];
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const fieldsByRef = new Map(fields.map((field) => [field.ref, field]));

  return responses.map<MaskedTypeformResponse>((response) => ({
    token: response.token,
    submittedAt: response.submitted_at,
    landedAt: response.landed_at,
    answers: (response.answers ?? []).map((answer, index) => {
      const field =
        fieldsById.get(answer.field?.id) ?? fieldsByRef.get(answer.field?.ref);
      const rawValue = getAnswerValue(answer);
      const sensitive = isSensitiveAnswer(answer, field);
      const isWinnerRevealed = unmaskTokens?.has(response.token) ?? false;
      const masked = maskSensitive && sensitive && !isWinnerRevealed;

      return {
        id: answer.field?.id ?? answer.field?.ref ?? `${response.token}-${index}`,
        question: field?.title ?? answer.field?.ref ?? "Pregunta sin titulo",
        fieldType: field?.type ?? answer.field?.type,
        answerType: answer.type,
        value: masked ? maskAnswerValue(rawValue, answer.type) : rawValue,
        masked,
      };
    }),
    hidden: Object.entries(response.hidden ?? {}).map(([key, value]) => ({
      id: key,
      question: key,
      answerType: "hidden",
      value:
        maskSensitive && !(unmaskTokens?.has(response.token) ?? false)
          ? maskAnswerValue(value, "text")
          : value,
      masked: maskSensitive && !(unmaskTokens?.has(response.token) ?? false),
    })),
  }));
}
