type ExportScope = "participants" | "winners";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EXPORT_ERROR = "No se pudo descargar la exportación. Inténtalo de nuevo.";

export async function downloadResponsesExport(baseHref: string, scope: ExportScope, options?: { winnerFlowToken?: string; signal?: AbortSignal }) {
  const url = new URL(baseHref, window.location.href);

  if (url.origin !== window.location.origin) {
    throw new Error("La dirección de exportación no es válida.");
  }

  url.searchParams.set("scope", scope);
  url.searchParams.set("format", "xlsx");
  url.hash = "";

  const response = await fetch(url.href, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: XLSX_CONTENT_TYPE, ...(options?.winnerFlowToken ? { "X-Winner-Flow": options.winnerFlowToken } : {}) },
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  if (response.status === 401 || response.redirected) {
    throw new Error("Tu sesión ha caducado. Inicia sesión de nuevo para exportar.");
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body &&
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : EXPORT_ERROR;

    throw new Error(message);
  }

  if (!response.headers.get("Content-Type")?.startsWith(XLSX_CONTENT_TYPE)) {
    throw new Error(EXPORT_ERROR);
  }

  const blob = await response.blob();
  if (options?.signal?.aborted) throw new DOMException("Consulta finalizada", "AbortError");

  if (blob.size === 0) {
    throw new Error("El archivo de exportación está vacío.");
  }

  const filename = response.headers.get("Content-Disposition")
    ?.match(/filename="([^"]+)"/i)?.[1];
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = filename ?? `${scope === "winners" ? "ganadores" : "participantes"}.xlsx`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // No revocar antes de que el navegador pueda comenzar a leer el archivo.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}