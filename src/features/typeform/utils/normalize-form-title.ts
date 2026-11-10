export function normalizeFormTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}