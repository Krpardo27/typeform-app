import { getTypeformFormResponses, type TypeformResponseItem } from "./typeform.service";

const PAGE_SIZE = 100;

export async function getWinnerResponsesByToken(formId: string, tokens: string[]) {
  const found = new Map<string, TypeformResponseItem>();
  const remaining = new Set(tokens);
  function collect(response: TypeformResponseItem) {
    if (remaining.has(response.token)) { found.set(response.token, response); remaining.delete(response.token); }
  }
  // response_id puede diferir de token; la paginación de respaldo verifica token.
  for (let offset = 0; offset < tokens.length; offset += PAGE_SIZE) {
    const batch = tokens.slice(offset, offset + PAGE_SIZE);
    try {
      const result = await getTypeformFormResponses(formId, { pageSize: batch.length, includedResponseIds: batch });
      result.items.forEach(collect);
    } catch { /* No registrar errores del proveedor: pueden contener PII. */ }
  }
  let before: string | undefined;
  const cursors = new Set<string>();
  const scanned = new Set<string>();
  let expectedTotal: number | undefined;
  while (remaining.size > 0) {
    const result = await getTypeformFormResponses(formId, { pageSize: PAGE_SIZE, before });
    if (expectedTotal === undefined && Number.isSafeInteger(result.total_items) && result.total_items >= 0) expectedTotal = result.total_items;
    result.items.forEach(collect);
    result.items.forEach((response) => scanned.add(response.token));
    if (remaining.size === 0 || result.items.length === 0) break;
    if (expectedTotal !== undefined && scanned.size >= expectedTotal) break;
    const last = result.items.at(-1)?.token;
    if (!last || cursors.has(last)) break;
    cursors.add(last);
    before = last;
  }
  return found;
}