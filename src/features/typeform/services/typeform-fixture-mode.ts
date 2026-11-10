/** Solo servidor: habilita respuestas sintéticas locales, nunca en producción. */
export function usesTypeformResponseFixtures(formId: string) {
  if (process.env.NODE_ENV === "production" ||
      process.env.TYPEFORM_RESPONSES_SOURCE !== "fixture" ||
      !/^[A-Za-z0-9_-]+$/.test(formId)) return false;

  const formIds = process.env.TYPEFORM_FIXTURE_FORM_IDS?.split(",")
    .map((id) => id.trim()).filter(Boolean);
  return !formIds?.length || formIds.includes(formId);
}

export const FIXTURE_READ_ONLY_MESSAGE =
  "Modo prueba local: puedes revisar participantes, filtrar y sortear, pero no guardar ni consultar ganadores reales.";