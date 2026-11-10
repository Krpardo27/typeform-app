import {
  getTypeformFormResponses,
  type TypeformResponseItem,
} from "./typeform.service";

const PAGE_SIZE = 100;
const INCOMPLETE_RESPONSES =
  "No se pudieron cargar todas las respuestas del formulario.";

export async function loadFormResponses(formId: string) {
  const responses = new Map<string, TypeformResponseItem>();
  let before: string | undefined;
  let expectedTotal: number | undefined;

  while (true) {
    const page = await getTypeformFormResponses(formId, { pageSize: PAGE_SIZE, before });

    if (!Number.isSafeInteger(page.total_items) || page.total_items < 0 || !Array.isArray(page.items)) {
      throw new Error(INCOMPLETE_RESPONSES);
    }

    expectedTotal ??= page.total_items;

    if (expectedTotal === 0 && page.items.length === 0) {
      return [];
    }
    if (expectedTotal === 0) throw new Error(INCOMPLETE_RESPONSES);

    const previousSize = responses.size;
    for (const response of page.items) {
      if (!response.token) throw new Error(INCOMPLETE_RESPONSES);
      if (!responses.has(response.token)) responses.set(response.token, response);
    }

    if (responses.size >= expectedTotal && expectedTotal > 0) {
      return [...responses.values()];
    }

    const nextCursor = page.items.at(-1)?.token;
    if (responses.size === previousSize || !nextCursor || nextCursor === before) {
      throw new Error(INCOMPLETE_RESPONSES);
    }

    before = nextCursor;
  }
}