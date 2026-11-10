import { CopyButton } from "@/shared/components/CopyButton";
import type { getEmbedInfo } from "@/features/typeform/utils/embed-info";

type WorkspaceFormMetaCardsProps = {
  formId: string;
  clonedFrom?: string;
  embedInfo: ReturnType<typeof getEmbedInfo>;
};

export function WorkspaceFormMetaCards({
  formId,
  clonedFrom,
  embedInfo,
}: WorkspaceFormMetaCardsProps) {
  const sourceFormId = clonedFrom?.trim();
  const hasDistinctSource = Boolean(sourceFormId && sourceFormId !== formId);
  const isEmbedCode = Boolean(embedInfo.src) && embedInfo.code !== formId;
  const copyValue = isEmbedCode ? embedInfo.code : formId;

  return (
    <section aria-label="Datos de integración del formulario" className="mt-8 min-w-0 max-w-4xl rounded-md border border-[#FF5C35]/30 bg-white text-[#171717]">
        <div className="flex flex-col gap-3 border-b border-[#FF5C35]/20 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base leading-snug font-semibold">
              {isEmbedCode ? embedInfo.label : "ID del formulario"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#595954]">
              {isEmbedCode
                ? "Copia este código para insertar el formulario actual en el sitio correspondiente."
                : "Usa este identificador para referenciar el formulario actual en Typeform."}
            </p>
          </div>

          <CopyButton
            value={copyValue}
            label={isEmbedCode ? "Copiar código" : "Copiar ID"}
            variant="subtle"
          />
        </div>

        <div className="px-4 py-5 sm:px-5">
          <pre
            role="region"
            aria-label={isEmbedCode ? "Código iframe del formulario actual" : "Identificador del formulario actual"}
            tabIndex={0}
            className="m-0 max-h-52 min-w-0 overflow-auto rounded-sm border-l-2 border-[#FF5C35]/50 bg-[#F7F7F6] p-3 text-sm leading-6 text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] sm:p-4"
          >
            <code className="whitespace-pre-wrap wrap-anywhere font-[ui-monospace,SFMono-Regular,Consolas,monospace]">{copyValue}</code>
          </pre>

          {(isEmbedCode || hasDistinctSource) && (
            <dl className="mt-4 flex flex-col gap-x-8 gap-y-3 text-sm leading-5 sm:flex-row sm:flex-wrap">
              <div className="min-w-0">
                <dt className="text-[#595954]">Formulario actual</dt>
                <dd className="mt-1 font-medium tabular-nums wrap-anywhere">{formId}</dd>
              </div>
              {hasDistinctSource && (
                <div className="min-w-0 border-l-2 border-[#FF5C35]/30 pl-3">
                  <dt className="text-[#595954]">Formulario de origen</dt>
                  <dd className="mt-1 font-medium tabular-nums wrap-anywhere">{sourceFormId}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
    </section>
  );
}