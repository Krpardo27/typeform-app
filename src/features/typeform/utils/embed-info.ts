export const ADN_TYPEFORM_ID = "2828888";
export const LOS40_TYPEFORM_ID = "416594";

export type EmbedConfig = {
  label: string;
  buildSrc: (formId: string) => string;
  buildCode: (formId: string) => string;
};

// Agregar un nuevo workspace = agregar una entrada acá, sin tocar getEmbedInfo.
export const WORKSPACE_EMBED_CONFIG: Record<string, EmbedConfig> = {
  [ADN_TYPEFORM_ID]: {
    label: "Código iframe (ADN)",
    buildSrc: (formId) => `https://prisa.typeform.com/to/${formId}`,
    buildCode: (formId) =>
      `<iframe frameborder="0" height="600" id="typeform-full" src="https://prisa.typeform.com/to/${formId}" width="100%"></iframe>`,
  },
  [LOS40_TYPEFORM_ID]: {
    label: "Código iframe (LOS40)",
    buildSrc: (formId) => `https://concursos.los40.cl/t/?id=${formId}`,
    // Nota: referrerpolicy="unsafe-url" envía la URL completa (con query params)
    // como referrer al form embebido. Es requisito del proveedor de concursos,
    // no removerlo sin confirmar con LOS40.
    buildCode: (formId) =>
      `<iframe id="concurso" width="100%" height="600px" referrerpolicy="unsafe-url" src="https://concursos.los40.cl/t/?id=${formId}" scrolling="no" marginwidth="0" marginheight="0" style="border:none;"></iframe>`,
  },
};

export function getEmbedInfo(
  formId: string,
  workspaceTypeformId: string,
  clonedFrom?: string,
): { code: string; label: string } {
  const config = WORKSPACE_EMBED_CONFIG[workspaceTypeformId];
  if (config) {
    return { code: config.buildCode(formId), label: config.label };
  }
  return {
    code: formId,
    label: clonedFrom
      ? "Typeform ID del duplicado"
      : "Typeform ID del formulario base",
  };
}
