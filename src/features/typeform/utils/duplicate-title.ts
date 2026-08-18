export function getSuggestedDuplicateTitle(title: string) {
  const normalized = title.trim();

  if (!normalized) {
    return "Formulario (copia)";
  }

  const copyMatch = normalized.match(
    /^(.*?)(?:\s+\((?:copia|copy)(?:\s+(\d+))?\))$/i,
  );

  if (copyMatch) {
    const baseTitle = copyMatch[1]?.trim();
    const currentCopyNumber = Number(copyMatch[2] ?? "1");

    if (baseTitle) {
      return `${baseTitle} (copia ${currentCopyNumber + 1})`;
    }
  }

  return `${normalized} (copia)`;
}
